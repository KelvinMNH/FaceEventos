const { Participante, HistoricoSincronizacao } = require('../models');
const axios = require('axios');

// ============================================================
// CONFIGURAÇÃO DA API EXTERNA (Unimed Maceió - CoopMais)
// ============================================================
const API_BASE_URL = process.env.COOPMAIS_API_URL || 'https://api.unimedmaceio.com.br';
const API_EMAIL    = process.env.COOPMAIS_EMAIL    || 'auto.atend.recep@unimedmaceio.com.br';
const API_PASSWORD = process.env.COOPMAIS_PASSWORD || '[}9tJHow*i*Tmd0r';

// ============================================================
// HELPERS
// ============================================================

/** Remove toda pontuação do CPF, retornando apenas os 11 dígitos */
function normalizarCpf(cpf) {
    if (!cpf) return null;
    return String(cpf).replace(/\D/g, '');
}

/**
 * Verifica se um cooperado está inativado com base na data de rescisão.
 * Só considera inativo se dt_rescisao existir E já tiver passado da data atual.
 */
function estaDesligado(dt_rescisao) {
    if (!dt_rescisao) return false;
    const dataRescisao = new Date(dt_rescisao);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataRescisao.setHours(0, 0, 0, 0);
    return dataRescisao <= hoje;
}

/**
 * Converte data no formato "dd/MM/yyyy" para "yyyy-MM-dd" (padrão SQLite/ISO).
 * Retorna null se inválido.
 */
function converterData(dtStr) {
    if (!dtStr) return null;
    const partes = dtStr.split(/[\/\-]/);
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    if (!dia || !mes || !ano) return null;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

/**
 * Mapeia cd_sexo da API para o ENUM do banco: 'M', 'F' ou 'O'.
 */
function mapearSexo(cd_sexo) {
    if (!cd_sexo) return 'O';
    const s = String(cd_sexo).toUpperCase().trim();
    if (s === 'M') return 'M';
    if (s === 'F') return 'F';
    return 'O';
}

/** Pausa assíncrona em milissegundos. */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// SERVIÇO PRINCIPAL
// ============================================================
class SyncParticipantesService {

    // ----------------------------------------------------------
    // Autenticar e obter o token JWT
    // ----------------------------------------------------------
    static async obterToken() {
        const response = await axios.post(
            `${API_BASE_URL}/fwk/auth/login`,
            { email: API_EMAIL, password: API_PASSWORD },
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const token = response.data?.access_token;
        if (!token) throw new Error('Token não retornado pela API de autenticação.');

        console.log('🔑 Token JWT obtido com sucesso.');
        return token;
    }

    // ----------------------------------------------------------
    // Buscar lista básica de cooperados na API externa
    // ----------------------------------------------------------
    static async fetchExternalData(token) {
        const response = await axios.get(
            `${API_BASE_URL}/coopmais/api/dados/basicos`,
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            }
        );

        const lista = response.data?.object;
        if (!Array.isArray(lista)) {
            throw new Error(`Resposta inesperada da API: ${JSON.stringify(response.data).substring(0, 200)}`);
        }

        console.log(`📡 API retornou ${lista.length} cooperados.`);
        return lista;
    }

    // ----------------------------------------------------------
    // Buscar detalhe de um único cooperado por CRM
    // Retorna null em caso de erro (não interrompe o lote)
    // ----------------------------------------------------------
    static async fetchDetalheCrm(crm, token) {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/coopmais/api/dados/basicos/${crm}`,
                { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
            );
            // O endpoint de detalhe retorna: { object: [{ dadosBasicos, especialidades, ... }] }
            // Precisamos de object[0] para acessar dadosBasicos
            return response.data?.object?.[0] ?? null;
        } catch (_) {
            return null;
        }
    }


    // ----------------------------------------------------------
    // Enriquecimento de dados: preenche genero e data_nascimento
    // para participantes com dados incompletos.
    // Processa em lotes de BATCH_SIZE requisições simultâneas.
    //
    // Opções:
    //   crmIds: string[] → enriquece somente esses CRMs (novos recém-adicionados)
    //   sem opções       → enriquece todos os pendentes (genero='O' ou nasc. null)
    // ----------------------------------------------------------
    static async enriquecerDados(token, { crmIds = null } = {}) {
        const BATCH_SIZE = 10;
        const PAUSA_MS   = 300;
        const { Op } = require('sequelize');

        // Quais participantes precisam de enriquecimento?
        let pendentes;
        if (crmIds && crmIds.length > 0) {
            pendentes = await Participante.findAll({
                where: { crm: { [Op.in]: crmIds } }
            });
        } else {
            pendentes = await Participante.findAll({
                where: {
                    crm: { [Op.ne]: null },
                    [Op.or]: [
                        { genero: 'O' },
                        { data_nascimento: null },
                        { especialidade: null }
                    ]
                }
            });
        }

        if (pendentes.length === 0) {
            console.log('✨ Todos os participantes já estão enriquecidos.');
            return { enriquecidos: 0, semCrm: 0, erros: 0 };
        }

        console.log(`🔍 Enriquecendo ${pendentes.length} participante(s) em lotes de ${BATCH_SIZE}...`);

        let enriquecidos = 0;
        let semCrm       = 0;
        let erros        = 0;

        for (let i = 0; i < pendentes.length; i += BATCH_SIZE) {
            const lote = pendentes.slice(i, i + BATCH_SIZE);

            await Promise.all(lote.map(async (participante) => {
                if (!participante.crm) { semCrm++; return; }

                const detalhe = await this.fetchDetalheCrm(participante.crm, token);

                if (!detalhe || !detalhe.dadosBasicos) { erros++; return; }

                const db           = detalhe.dadosBasicos;
                const novoGenero   = mapearSexo(db.cd_sexo);
                const novaDataNasc = converterData(db.dt_nascimento);
                
                // Extrair especialidade (primeira da lista se houver)
                let especialidade = null;
                if (detalhe.especialidades && detalhe.especialidades.length > 0) {
                    especialidade = detalhe.especialidades[0].ds_especialidade;
                }

                // Montar apenas os campos que a API trouxe como válidos
                const atualizacoes = {};
                if (novoGenero !== 'O') atualizacoes.genero = novoGenero;
                if (novaDataNasc)       atualizacoes.data_nascimento = novaDataNasc;
                if (especialidade)      atualizacoes.especialidade = especialidade;

                // Gravar via update() por ID (seguro para uso dentro de Promise.all)
                if (Object.keys(atualizacoes).length > 0) {
                    await Participante.update(atualizacoes, { where: { id: participante.id } });
                    enriquecidos++;
                }
            }));

            // Progresso
            const processados = Math.min(i + BATCH_SIZE, pendentes.length);
            process.stdout.write(`\r   → ${processados}/${pendentes.length} processados...`);

            if (i + BATCH_SIZE < pendentes.length) {
                await sleep(PAUSA_MS);
            }
        }

        process.stdout.write('\n');
        console.log(
            `✅ Enriquecimento concluído! ` +
            `Atualizados: ${enriquecidos}, Sem CRM: ${semCrm}, Sem retorno da API: ${erros}`
        );
        return { enriquecidos, semCrm, erros };
    }

    // ----------------------------------------------------------
    // SYNC PRINCIPAL
    // Fase 1: sincroniza lista básica (adiciona, atualiza, inativa)
    // Fase 2: enriquece novos cooperados com sexo e nascimento
    // Fase 3: enriquece todos os demais pendentes do histórico
    // ----------------------------------------------------------
    static async sync() {
        try {
            console.log('🔄 Iniciando sincronização de participantes...');

            // 1. Autenticar (token reutilizado em todo o processo)
            const token = await this.obterToken();

            // 2. Buscar dados externos
            const cooperadosExternos = await this.fetchExternalData(token);

            // 3. Carregar participantes atuais do banco
            const participantesAtuais = await Participante.findAll();

            const mapaAtuaisPorCpf = new Map(
                participantesAtuais.filter(p => p.cpf).map(p => [normalizarCpf(p.cpf), p])
            );
            const mapaAtuaisPorCrm = new Map(
                participantesAtuais.filter(p => p.crm).map(p => [String(p.crm).replace(/\D/g, ''), p])
            );

            const cpfsRecebidos   = new Set();
            const crmsAdicionados = []; // CRMs novos para enriquecer com prioridade

            let adicionados = 0;
            let modificados = 0;
            let inativados  = 0;
            let pulados     = 0;

            console.log(`📊 Processando ${cooperadosExternos.length} cooperados...`);

            // 4. Processar cada cooperado recebido
            for (const coop of cooperadosExternos) {
                const cpfLimpo  = normalizarCpf(coop.cpf);
                const crmLimpo  = coop.crm ? String(coop.crm).replace(/\D/g, '') : null;
                const desligado = estaDesligado(coop.dt_rescisao);

                if (cpfLimpo) cpfsRecebidos.add(cpfLimpo);

                if (desligado) {
                    const existente = cpfLimpo
                        ? mapaAtuaisPorCpf.get(cpfLimpo)
                        : (crmLimpo ? mapaAtuaisPorCrm.get(crmLimpo) : null);

                    if (existente && existente.ativo) {
                        existente.ativo = false;
                        await existente.save();
                        inativados++;
                    }
                    pulados++;
                    continue;
                }

                let existente = cpfLimpo ? mapaAtuaisPorCpf.get(cpfLimpo) : null;
                if (!existente && crmLimpo) existente = mapaAtuaisPorCrm.get(crmLimpo);

                if (!existente) {
                    // Novo cooperado — criar sem genero (será preenchido no enriquecimento)
                    await Participante.create({
                        nome:   coop.nome ? coop.nome.trim() : '',
                        cpf:    cpfLimpo,
                        crm:    crmLimpo || null,
                        genero: 'O',
                        ativo:  true
                    });
                    if (crmLimpo) crmsAdicionados.push(crmLimpo);
                    adicionados++;
                } else {
                    const nomeNormalizado = coop.nome ? coop.nome.trim() : '';
                    let precisaAtualizar  = false;

                    if (existente.nome !== nomeNormalizado)                     precisaAtualizar = true;
                    if (crmLimpo && existente.crm !== crmLimpo)                 precisaAtualizar = true;
                    if (cpfLimpo && normalizarCpf(existente.cpf) !== cpfLimpo) precisaAtualizar = true;
                    if (existente.ativo === false)                               precisaAtualizar = true;

                    if (precisaAtualizar) {
                        existente.nome  = nomeNormalizado;
                        existente.cpf   = cpfLimpo;
                        if (crmLimpo) existente.crm = crmLimpo;
                        existente.ativo = true;
                        await existente.save();
                        modificados++;
                    }
                }
            }

            // 5. Inativar quem não veio na API
            for (const p of participantesAtuais) {
                const cpfP = normalizarCpf(p.cpf);
                if (p.ativo === true && cpfP && !cpfsRecebidos.has(cpfP)) {
                    p.ativo = false;
                    await p.save();
                    inativados++;
                }
            }

            // 6. Registrar histórico
            const novoTotal = await Participante.count({ where: { ativo: true } });

            await HistoricoSincronizacao.create({
                total_participantes: novoTotal,
                qtd_adicionados:     adicionados,
                qtd_modificados:     modificados,
                qtd_removidos:       inativados,
                status:              'sucesso'
            });

            console.log(
                `\n✅ Sync concluído! Adicionados: ${adicionados}, ` +
                `Modificados: ${modificados}, Inativados: ${inativados}, ` +
                `Ignorados: ${pulados}, Total ativo: ${novoTotal}`
            );

            // 7. Enriquecimento — prioridade para novos, depois os demais pendentes
            console.log('\n🌟 Fase de enriquecimento (sexo e data de nascimento)...');

            if (crmsAdicionados.length > 0) {
                console.log(`   → ${crmsAdicionados.length} novo(s) cooperado(s) para enriquecer primeiro...`);
                await this.enriquecerDados(token, { crmIds: crmsAdicionados });
            }

            // Enriquece todos os demais que ainda estejam pendentes
            await this.enriquecerDados(token);

            return { sucesso: true, adicionados, modificados, inativados, total: novoTotal };

        } catch (error) {
            console.error('❌ Erro na sincronização de participantes:', error.message || error);
            try {
                await HistoricoSincronizacao.create({
                    status:        'erro',
                    detalhes_erro: error.message || 'Erro desconhecido'
                });
            } catch (_) { /* silencioso */ }
            return { sucesso: false, erro: error.message };
        }
    }
}

module.exports = SyncParticipantesService;
