const { Evento, Participante, RegistroAcesso } = require('../models');
const { Op } = require('sequelize');

class AcessoController {
    async scan(req, res) {
        const { device_id, template, force_match_id } = req.body;
        try {
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            if (!evento) return res.json({ autorizado: false, mensagem: "Nenhum evento ativo." });

            let participante = null;
            if (force_match_id) {
                participante = await Participante.findByPk(force_match_id);
            } else {
                participante = await Participante.findOne({ where: { template_biometrico: template } });
            }

            const status = participante ? 'sucesso' : 'nao_encontrado';
            const acesso = await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: status,
                device_id: device_id || 'unknown',
                EventoId: evento.id,
                ParticipanteId: participante ? participante.id : null
            });

            if (participante) {
                return res.json({
                    autorizado: true,
                    participante: { nome: participante.nome, documento: participante.documento },
                    mensagem: "Acesso Permitido",
                    access_id: acesso.id
                });
            } else {
                return res.json({ autorizado: false, mensagem: "Biometria não cadastrada", access_id: acesso.id });
            }
        } catch (error) {
            res.status(500).json({ error: "Erro interno" });
        }
    }

    async simulate(req, res) {
        try {
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

            const isSuccess = Math.random() > 0.1;
            let participante = null;

            if (isSuccess) {
                const count = await Participante.count({ where: { ativo: true } });
                if (count > 0) {
                    const randomOffset = Math.floor(Math.random() * count);
                    participante = await Participante.findOne({ where: { ativo: true }, offset: randomOffset });
                }
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
            res.status(500).json({ error: "Erro na simulação" });
        }
    }

    async manualEntry(req, res) {
        try {
            const { query } = req.body;
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

            const participante = await Participante.findOne({
                where: {
                    [Op.or]: [
                        { documento: query },
                        { nome: { [Op.like]: `%${query}%` } }
                    ]
                }
            });

            if (!participante) return res.json({ success: false, msg: "Participante não encontrado", not_found: true });

            await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso',
                device_id: 'manual_entry_web',
                EventoId: evento.id,
                ParticipanteId: participante.id
            });

            res.json({ success: true, status: 'sucesso', participante });
        } catch (e) {
            res.status(500).json({ error: "Erro na entrada manual" });
        }
    }

    async cadastrarEntrada(req, res) {
        try {
            const { nome, documento, genero, data_nascimento } = req.body;
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });

            let participante = await Participante.findOne({ where: { documento } });
            if (participante) return res.json({ success: false, msg: "Documento já cadastrado." });

            participante = await Participante.create({
                nome, documento, genero: genero || 'Outro', data_nascimento,
                ativo: true, template_biometrico: 'manual_' + Date.now()
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
            res.status(500).json({ error: "Erro ao cadastrar entrada" });
        }
    }

    async registrarSaida(req, res) {
        try {
            const { participanteId } = req.body;
            const evento = await Evento.findOne({ where: { status: 'ativo' } });
            if (!evento) return res.json({ success: false, msg: "Sem evento ativo" });
            if (!evento.habilitar_checkout) return res.json({ success: false, msg: "Este evento não permite checkout" });

            const participante = await Participante.findByPk(participanteId);
            if (!participante) return res.json({ success: false, msg: "Participante não encontrado" });

            const jaFezCheckout = await RegistroAcesso.findOne({
                where: { EventoId: evento.id, ParticipanteId: participanteId, tipo_acesso: 'saida' }
            });

            if (jaFezCheckout) return res.json({ success: false, msg: "Checkout já realizado", already_checked_out: true });

            await RegistroAcesso.create({
                tipo_acesso: 'saida',
                status_validacao: 'sucesso',
                device_id: 'checkout_totem',
                EventoId: evento.id,
                ParticipanteId: participanteId
            });

            res.json({ success: true, participante });
        } catch (e) {
            res.status(500).json({ error: "Erro ao registrar saída" });
        }
    }

    async getLogs(req, res) {
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
    }
}

module.exports = new AcessoController();
