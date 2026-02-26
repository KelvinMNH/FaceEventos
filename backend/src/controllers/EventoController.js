const { Evento, LogAuditoria } = require('../models');

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

            // Registrar Log
            try {
                if (req.user && req.user.id) {
                    await LogAuditoria.create({
                        acao: 'CRIACAO_EVENTO',
                        usuario_id: req.user.id,
                        detalhes: `Evento "${novoEvento.nome}" (ID: ${novoEvento.id}) criado.`
                    });
                }
            } catch (logError) {
                console.error('Erro ao registrar log de auditoria na criação de evento:', logError);
            }

            res.json({ success: true, evento: novoEvento });
        } catch (error) {
            console.error('❌ Erro detalhado ao criar evento:', error);
            res.status(500).json({
                error: "Erro ao criar evento",
                details: error.message,
                validationErrors: error.errors ? error.errors.map(e => e.message) : null
            });
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

    async excluir(req, res) {
        try {
            const { id } = req.params;
            const evento = await Evento.findByPk(id);

            if (!evento) {
                return res.status(404).json({ error: "Evento não encontrado" });
            }

            const nomeEvento = evento.nome;

            // Deletar o evento (onDelete CASCADE cuidará dos registros de acesso se configurado no DB,
            // caso contrário precisaria deletar os registros antes).
            await evento.destroy();

            // Registrar Log
            try {
                if (req.user && req.user.id) {
                    await LogAuditoria.create({
                        acao: 'EXCLUSAO_EVENTO',
                        usuario_id: req.user.id,
                        detalhes: `Evento "${nomeEvento}" (ID: ${id}) excluído.`
                    });
                }
            } catch (logError) {
                console.error('Erro ao registrar log de auditoria na exclusão de evento:', logError);
            }

            res.json({ success: true, message: "Evento excluído com sucesso." });
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
            res.status(500).json({ error: "Erro ao excluir evento", details: error.message });
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

    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const evento = await Evento.findByPk(id);
            if (!evento) return res.status(404).json({ error: "Evento não encontrado" });
            res.json(evento);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = new EventoController();
