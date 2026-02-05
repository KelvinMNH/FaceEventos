const { Evento } = require('../models');

class EventoController {
    async listar(req, res) {
        try {
            const eventos = await Evento.findAll({
                order: [['data_inicio', 'DESC'], ['createdAt', 'DESC']]
            });
            res.json(eventos || []);
        } catch (error) {
            res.status(500).json([]);
        }
    }

    async criar(req, res) {
        try {
            const { nome, data, hora, local, imagem, permitir_acompanhantes, max_acompanhantes, habilitar_checkout } = req.body;
            const novoEvento = await Evento.create({
                nome,
                data_inicio: data,
                hora_inicio: hora,
                local: local,
                imagem: imagem,
                status: 'ativo',
                permitir_acompanhantes,
                max_acompanhantes,
                habilitar_checkout: habilitar_checkout || false
            });
            res.json({ success: true, evento: novoEvento });
        } catch (error) {
            res.status(500).json({ error: "Erro ao criar evento" });
        }
    }

    async ativar(req, res) {
        try {
            const { id } = req.params;
            await Evento.update({ status: 'agendado' }, { where: { status: 'ativo' } });
            await Evento.update({ status: 'ativo' }, { where: { id: id } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Erro ao ativar evento" });
        }
    }

    async finalizar(req, res) {
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
    }

    async getAtivo(req, res) {
        try {
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            res.json(evento || null);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = new EventoController();
