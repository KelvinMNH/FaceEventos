const { Participante, HistoricoSincronizacao } = require('../models');
const axios = require('axios'); // Caso fosse usar real

class SyncParticipantesService {
    static async sync() {
        try {
            console.log("🔄 Iniciando sincronização de participantes...");

            // 1. Obter dados da API Externa (Mock por enquanto)
            const participantesExternos = await this.fetchExternalData();

            // 2. Obter participantes atuais do nosso banco (apenas os ativos e inativos, para não criar duplicado)
            const participantesAtuais = await Participante.findAll();

            // Mapas para busca rápida
            const mapaAtuaisPorCpf = new Map(participantesAtuais.filter(p => p.cpf).map(p => [p.cpf, p]));
            const mapaAtuaisPorCrm = new Map(participantesAtuais.filter(p => p.crm && p.crm.trim() !== '').map(p => [p.crm, p]));

            // Conjunto de CPFs recebidos para saber quem não veio
            const cpfsRecebidos = new Set();

            let adicionados = 0;
            let modificados = 0;
            let inativados = 0;

            console.log(`📊 Recebidos ${participantesExternos.length} participantes da API externa. Validando...`);

            // 3. Processar cada participante recebido
            for (const ext of participantesExternos) {
                // Tenta achar pelo CPF primeiro, se não achar tenta pelo CRM
                let existente = null;
                if (ext.cpf) {
                    existente = mapaAtuaisPorCpf.get(ext.cpf);
                    cpfsRecebidos.add(ext.cpf); // Marcamos que esse CPF não deve ser inativado
                } else if (ext.crm) {
                    existente = mapaAtuaisPorCrm.get(ext.crm);
                }

                if (!existente) {
                    // Novo - Criar
                    await Participante.create({
                        nome: ext.nome,
                        cpf: ext.cpf,
                        crm: ext.crm || null,
                        genero: ext.genero || 'O',
                        data_nascimento: ext.data_nascimento || null,
                        ativo: true
                    });
                    adicionados++;
                } else {
                    // Existente - Verificar se precisa atualizar
                    let precisaAtualizar = false;

                    if (existente.nome !== ext.nome) precisaAtualizar = true;
                    if (ext.crm && existente.crm !== ext.crm) precisaAtualizar = true;
                    // Se estiver inativo, mas voltou na API, vamos reativar
                    if (existente.ativo === false) precisaAtualizar = true;

                    if (precisaAtualizar) {
                        existente.nome = ext.nome;
                        if (ext.crm) existente.crm = ext.crm;
                        existente.ativo = true;

                        await existente.save();
                        modificados++;
                    }
                }
            }

            // 4. Inativar quem não veio na API externa
            // Aqueles que estão ativos no nosso banco, têm um CPF, e o CPF deles não está no conjunto cpfsRecebidos
            for (const p of participantesAtuais) {
                if (p.ativo === true && p.cpf && !cpfsRecebidos.has(p.cpf)) {
                    // Participante sumiu da API externa
                    p.ativo = false;
                    await p.save();
                    inativados++;
                }
            }

            // 5. Registrar Histórico
            const novoTotal = await Participante.count({ where: { ativo: true } });

            await HistoricoSincronizacao.create({
                total_participantes: novoTotal,
                qtd_adicionados: adicionados,
                qtd_modificados: modificados,
                qtd_removidos: inativados, // Interpretado como "removidos/inativados"
                status: 'sucesso'
            });

            console.log(`✅ Sincronização concluída! Adicionados: ${adicionados}, Modificados: ${modificados}, Inativados: ${inativados}`);
            return { sucesso: true, adicionados, modificados, inativados, total: novoTotal };

        } catch (error) {
            console.error("❌ Erro na sincronização de participantes:", error);
            await HistoricoSincronizacao.create({
                status: 'erro',
                detalhes_erro: error.message || 'Erro desconhecido'
            });
            return { sucesso: false, erro: error.message };
        }
    }

    static async fetchExternalData() {
        // MOCK DE DADOS DA API
        // Aqui deve entrar a requisição real no futuro
        // Exemplo: const response = await axios.get(process.env.API_PARTICIPANTES_URL); return response.data;

        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulando que ele traz participantes com suas atualizações
                const fakeApi = [
                    { nome: 'Kelvin Higino', cpf: '100.456.789-00', crm: 'CRM/AL 10000', genero: 'M', data_nascimento: '1990-01-01' },
                    { nome: 'João Silva', cpf: '101.456.789-01', crm: null, genero: 'M', data_nascimento: '1995-02-15' },
                    { nome: 'Ana Nova', cpf: '999.888.777-66', crm: null, genero: 'F', data_nascimento: '2000-05-20' }, // Participante novo
                    // Maria Oliveira foi omitida simulando que ela foi removida do sistema da empresa
                ];
                resolve(fakeApi);
            }, 1000); // Finge um delay de rede
        });
    }
}

module.exports = SyncParticipantesService;
