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
app.post('/api/simulate', async (req, res) => {
    try {
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

        // 80% chance de sucesso
        const isSuccess = Math.random() > 0.2;
        let participante = null;

        if (isSuccess) {
            // Pegar um participante aleatório do banco
            // SQLite order by random
            participante = await Participante.findOne({ order: sequelize.random() });
        }

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
        console.error(e);
        res.status(500).json({ error: "Erro na simulação" });
    }
});

// Endpoint para Entrada Manual (Caso a biometria falhe)
app.post('/api/manual-entry', async (req, res) => {
    try {
        const { documento } = req.body;
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

        const participante = await Participante.findOne({ where: { documento: documento } });
        const status = participante ? 'sucesso' : 'nao_encontrado';

        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: status,
            device_id: 'manual_entry_web',
            EventoId: evento.id,
            ParticipanteId: participante ? participante.id : null
        });

        res.json({ success: true, status, participante });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro na entrada manual" });
    }
});

// Endpoint para o Frontend (Dashboard)
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await RegistroAcesso.findAll({
            order: [['createdAt', 'DESC']],
            limit: 20,
            include: [
                { model: Participante, attributes: ['nome', 'documento', 'genero', 'data_nascimento', 'categoria'] },
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

        // 1. Finalizar eventos anteriores
        await Evento.update({ status: 'finalizado' }, { where: { status: 'ativo' } });

        // 2. Criar novo
        const novoEvento = await Evento.create({
            nome,
            data_inicio: data,
            hora_inicio: hora,
            local: local,
            imagem: imagem,
            status: 'ativo'
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
    // alter: true tenta atualizar colunas sem apagar dados.
    await sequelize.sync({ force: false });
    console.log(`Backend rodando na porta ${PORT}`);
});
