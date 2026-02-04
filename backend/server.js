const express = require('express');
const cors = require('cors');
const { sequelize, Evento, Participante, RegistroAcesso, syncDB } = require('./models');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Endpoint para a Bridge Biométrica
app.post('/api/scan', async (req, res) => {
    const { device_id, template, force_match_id } = req.body;

    try {
        // 1. Encontrar evento ativo
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) {
            return res.json({ autorizado: false, mensagem: "Nenhum evento ativo." });
        }

        // 2. Simular Matching Biométrico
        // Na vida real, usaria um SDK ou comparação de features.
        // Aqui vamos comparar string direta ou usar um ID forçado para teste.

        let participante = null;

        if (force_match_id) {
            participante = await Participante.findByPk(force_match_id);
        } else {
            // Procura exato (simulação)
            participante = await Participante.findOne({ where: { template_biometrico: template } });
        }

        const status = participante ? 'sucesso' : 'nao_encontrado';

        // 3. Registrar Acesso
        const acesso = await RegistroAcesso.create({
            tipo_acesso: 'entrada', // Lógica simplificada
            status_validacao: status,
            device_id: device_id || 'unknown',
            EventoId: evento.id,
            ParticipanteId: participante ? participante.id : null
        });

        // 4. Retornar resposta
        if (participante) {
            return res.json({
                autorizado: true,
                participante: { nome: participante.nome, documento: participante.documento },
                mensagem: "Acesso Permitido",
                access_id: acesso.id
            });
        } else {
            return res.json({
                autorizado: false,
                mensagem: "Biometria não cadastrada",
                access_id: acesso.id
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro interno" });
    }
});

// Endpoint de Simulação (Chamado pelo botão no frontend)
// Endpoint de Simulação (Chamado pelo botão no frontend)
app.post('/api/simulate', async (req, res) => {
    try {
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

        // 90% chance de sucesso
        const isSuccess = Math.random() > 0.1;
        let participante = null;

        if (isSuccess) {
            // Método robusto para pegar aleatório
            const count = await Participante.count({ where: { ativo: true } });
            console.log(`Simulação: ${count} participantes encontrados no banco.`);

            if (count > 0) {
                const randomOffset = Math.floor(Math.random() * count);
                participante = await Participante.findOne({
                    where: { ativo: true },
                    offset: randomOffset
                });
            }
        }

        console.log("Simulação Resultado:", participante ? participante.nome : "Não encontrado (ou sorteado para falhar)");

        const status = participante ? 'sucesso' : 'nao_encontrado';

        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: status,
            device_id: 'sim_btn_web',
            EventoId: evento.id,
            ParticipanteId: participante ? participante.id : null
        });

        res.json({ success: true, status });
    } catch (e) {
        console.error("Erro na simulação:", e);
        res.status(500).json({ error: "Erro na simulação" });
    }
});

    }
});

// Endpoint para registrar acesso por ID (confirmação manual)
app.post('/api/registrar-acesso-id', async (req, res) => {
    console.log("Recebida requisição para registrar acesso manual:", req.body);
    try {
        const { participanteId } = req.body;
        console.log("ParticipanteID:", participanteId);

        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) {
            console.log("Evento ativo não encontrado");
            return res.json({ success: false, msg: "Sem evento ativo" });
        }

        const participante = await Participante.findByPk(participanteId);
        if (!participante) {
            console.log("Participante não encontrado no banco");
            return res.json({ success: false, msg: "Participante inválido" });
        }

        console.log("Participante encontrado:", participante.nome);

        // Verificar se já entrou no evento
        const ultimoAcesso = await RegistroAcesso.findOne({
            where: {
                EventoId: evento.id,
                ParticipanteId: participante.id,
                status_validacao: 'sucesso'
            },
            order: [['createdAt', 'DESC']]
        });

        // Se já entrou há menos de 1 minuto, bloquear (evita duplo clique)
        if (ultimoAcesso) {
            const agora = new Date();
            const diferenca = agora - new Date(ultimoAcesso.createdAt);
            if (diferenca < 60000) { // 1 minuto de intervalo
                console.log("Acesso duplicado bloqueado:", diferenca, "ms");
                return res.json({ success: false, msg: "Entrada já registrada recentemente!" });
            }
        }

        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: 'sucesso',
            device_id: 'manual_entry_web_confirmed',
            EventoId: evento.id,
            ParticipanteId: participante.id
        });

        res.json({ success: true, status: 'sucesso', participante });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao registrar acesso manual" });
    }
});

// Endpoint para Entrada Manual (mantido para compatibilidade ou fluxo rápido)
app.post('/api/manual-entry', async (req, res) => {
    try {
        const { query } = req.body;
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

        const { Op } = require('sequelize');

        const participante = await Participante.findOne({
            where: {
                [Op.or]: [
                    { documento: query },
                    { nome: { [Op.like]: `%${query}%` } }
                ]
            }
        });

        const status = participante ? 'sucesso' : 'nao_encontrado';

        // Se não encontrado, não registra entrada ainda, retorna aviso para frontend oferecer cadastro
        if (!participante) {
            return res.json({ success: false, msg: "Participante não encontrado", not_found: true });
        }

        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: status,
            device_id: 'manual_entry_web',
            EventoId: evento.id,
            ParticipanteId: participante.id
        });

        res.json({ success: true, status, participante });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro na entrada manual" });
    }
});

// Endpoint para Cadastrar e Dar Entrada (Novo Participante)
app.post('/api/cadastrar-entrada', async (req, res) => {
    try {
        const { nome, documento, genero, data_nascimento } = req.body;
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

        // Verifica se já existe documento
        let participante = await Participante.findOne({ where: { documento } });
        if (participante) {
            return res.json({ success: false, msg: "Documento já cadastrado." });
        }

        participante = await Participante.create({
            nome,
            documento,
            genero: genero || 'Outro',
            data_nascimento, // pode ser null
            ativo: true,
            template_biometrico: 'manual_' + Date.now() // placeholder
        });

        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: 'sucesso',
            device_id: 'new_entry_web',
            EventoId: evento.id,
            ParticipanteId: participante.id
        });

        res.json({ success: true, status: 'sucesso', participante });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao cadastrar entrada" });
    }
});

// Endpoint de Busca de Participantes (Sem registrar acesso)
app.get('/api/participantes/busca', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const { Op } = require('sequelize');
        const participantes = await Participante.findAll({
            where: {
                [Op.or]: [
                    { documento: q },
                    { nome: { [Op.like]: `%${q}%` } }
                ]
            },
            limit: 10
        });
        res.json(participantes);
    } catch (e) {
        res.status(500).json({ error: "Erro na busca" });
    }
});

// Endpoint para Registrar Acompanhante
app.post('/api/registrar-acompanhante', async (req, res) => {
    try {
        const { nome, responsavel_id } = req.body;
        const evento = await Evento.findOne({ where: { status: 'ativo' } });

        if (!evento) return res.status(400).json({ success: false, msg: "Sem evento ativo" });
        if (!evento.permitir_acompanhantes) return res.status(400).json({ success: false, msg: "Evento não permite acompanhantes" });

        // Verificar limite
        if (evento.max_acompanhantes > 0) {
            const currentCompanions = await RegistroAcesso.count({
                where: {
                    EventoId: evento.id,
                    responsavel_id: responsavel_id
                }
            });
            if (currentCompanions >= evento.max_acompanhantes) {
                return res.status(400).json({ success: false, msg: `Limite de ${evento.max_acompanhantes} acompanhantes atingido.` });
            }
        }

        // Criar Participante 'Acompanhante'
        const uniqueDoc = `ACP-${responsavel_id}-${Date.now()}`;
        const acompanhante = await Participante.create({
            nome: nome,
            documento: uniqueDoc,
            categoria: 'Outros', // Poderia ser uma nova categoria se o enum permitir, por enquanto usa Outros
            ativo: true
        });

        // Registrar Acesso
        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: 'sucesso',
            device_id: 'manual_companion',
            EventoId: evento.id,
            ParticipanteId: acompanhante.id,
            responsavel_id: responsavel_id
        });

        res.json({ success: true, msg: "Acompanhante registrado com sucesso!" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao registrar acompanhante: " + e.message });
    }
});

// Endpoint para o Frontend (Dashboard)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await RegistroAcesso.findAll({
            order: [['createdAt', 'DESC']],
            limit: 1000,
            include: [
                { model: Participante, attributes: ['id', 'nome', 'documento', 'cpf', 'crm', 'genero', 'data_nascimento', 'categoria'] },
                { model: Participante, as: 'Responsavel', attributes: ['nome'] },
                { model: Evento, attributes: ['nome'] }
            ]
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de Status
app.get('/api/status', (req, res) => res.json({ online: true, time: new Date() }));

// --- Rotas de Eventos ---

// Listar eventos (incluindo finalizados para histórico)
app.get('/api/eventos', async (req, res) => {
    try {
        const eventos = await Evento.findAll({
            // Listar todos para ver histórico também
            order: [['data_inicio', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(eventos || []);
    } catch (error) {
        res.status(500).json([]);
    }
});

// Ativar um evento específico
app.post('/api/eventos/:id/ativar', async (req, res) => {
    try {
        const { id } = req.params;
        // Desativar outros
        await Evento.update({ status: 'agendado' }, { where: { status: 'ativo' } });
        // Ativar este
        await Evento.update({ status: 'ativo' }, { where: { id: id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao ativar evento" });
    }
});

// Finalizar um evento
app.post('/api/eventos/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;
        await Evento.update({
            status: 'finalizado',
            data_fim: new Date()
        }, { where: { id: id } });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao finalizar evento" });
    }
});

// Criar novo evento
app.post('/api/eventos', async (req, res) => {
    try {
        const { nome, data, hora, local, imagem } = req.body;

        // Criar novo evento
        const novoEvento = await Evento.create({
            nome,
            data_inicio: data,
            hora_inicio: hora,
            local: local,
            imagem: imagem,
            status: 'ativo',
            permitir_acompanhantes: req.body.permitir_acompanhantes,
            max_acompanhantes: req.body.max_acompanhantes
        });

        res.json({ success: true, evento: novoEvento });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao criar evento" });
    }
});

// Pegar evento ativo
app.get('/api/evento-ativo', async (req, res) => {
    try {
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        res.json(evento || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Inicialização
app.listen(PORT, async () => {
    // Inicializar Banco e Seed
    await syncDB();
    console.log(`Backend rodando na porta ${PORT}`);
});
