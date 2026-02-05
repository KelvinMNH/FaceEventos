const { Participante, Evento, RegistroAcesso } = require('../models');
const { Op } = require('sequelize');

class ParticipanteController {
    async buscar(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.json([]);
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
    }

    async listar(req, res) {
        try {
            const participantes = await Participante.findAll({ order: [['nome', 'ASC']] });
            res.json(participantes);
        } catch (e) {
            res.status(500).json({ error: "Erro ao listar participantes" });
        }
    }

    async registrarAcompanhante(req, res) {
        try {
            const { nome, responsavel_id } = req.body;
            const evento = await Evento.findOne({ where: { status: 'ativo' } });

            if (!evento) return res.status(400).json({ success: false, msg: "Sem evento ativo" });
            if (!evento.permitir_acompanhantes) return res.status(400).json({ success: false, msg: "Evento não permite acompanhantes" });

            if (evento.max_acompanhantes > 0) {
                const currentCompanions = await RegistroAcesso.count({
                    where: { EventoId: evento.id, responsavel_id: responsavel_id }
                });
                if (currentCompanions >= evento.max_acompanhantes) {
                    return res.status(400).json({ success: false, msg: `Limite de ${evento.max_acompanhantes} acompanhantes atingido.` });
                }
            }

            const uniqueDoc = `ACP-${responsavel_id}-${Date.now()}`;
            const acompanhante = await Participante.create({
                nome: nome,
                documento: uniqueDoc,
                categoria: 'Outros',
                ativo: true
            });

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
            res.status(500).json({ error: "Erro ao registrar acompanhante: " + e.message });
        }
    }
}

module.exports = new ParticipanteController();
