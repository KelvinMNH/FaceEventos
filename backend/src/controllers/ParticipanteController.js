const { Participante, Evento, Acompanhante, RegistroAcesso } = require('../models');
const { Op } = require('sequelize');

class ParticipanteController {
    async buscar(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.json([]);
            const participantes = await Participante.findAll({
                where: {
                    [Op.or]: [
                        { nome: { [Op.like]: `%${q}%` } },
                        { cpf: { [Op.like]: `%${q}%` } },
                        { crm: { [Op.like]: `%${q}%` } }
                    ]
                },
                limit: 10
            });
            res.json(participantes);
        } catch (e) {
            console.error("Erro na busca de participantes:", e);
            res.status(500).json({ error: "Erro na busca", details: e.message });
        }
    }

    async listar(req, res) {
        try {
            const participantes = await Participante.findAll({ order: [['nome', 'ASC']] });
            res.json(participantes);
        } catch (e) {
            console.error("Erro ao listar participantes:", e);
            res.status(500).json({ error: "Erro ao listar participantes", details: e.message });
        }
    }

    async registrarAcompanhante(req, res) {
        try {
            const { nome, responsavel_id } = req.body;
            const evento = await Evento.findOne({ where: { status: 'ativo' } });

            if (!evento) return res.status(400).json({ success: false, msg: "Sem evento ativo" });
            if (!evento.permitir_acompanhantes) return res.status(400).json({ success: false, msg: "Evento não permite acompanhantes" });

            if (evento.max_acompanhantes > 0) {
                const currentCompanions = await Acompanhante.count({
                    where: { ParticipanteId: responsavel_id }
                });
                if (currentCompanions >= evento.max_acompanhantes) {
                    return res.status(400).json({ success: false, msg: `Limite de ${evento.max_acompanhantes} acompanhantes atingido.` });
                }
            }

            const uniqueDoc = `ACP-${responsavel_id}-${Date.now()}`;
            const acompanhante = await Acompanhante.create({
                nome: nome,
                ParticipanteId: responsavel_id,
                cpf: uniqueDoc, // Usando CPF como identificador único interno para acomp.
                categoria: 'Outros',
                ativo: true
            });

            await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso',
                device_id: 'manual_companion',
                EventoId: evento.id,
                AcompanhanteId: acompanhante.id
            });

            res.json({ success: true, msg: "Acompanhante registrado com sucesso!" });
        } catch (e) {
            res.status(500).json({ error: "Erro ao registrar acompanhante: " + e.message });
        }
    }
}

module.exports = new ParticipanteController();
