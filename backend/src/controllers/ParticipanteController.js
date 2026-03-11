const { Participante, Evento, Acompanhante, RegistroAcesso, HistoricoSincronizacao } = require('../models');
const { Op } = require('sequelize');
const SyncParticipantesService = require('../services/SyncParticipantesService');

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

    async criar(req, res) {
        try {
            console.log("📥 [ParticipanteController] Criando participante:", req.body);
            const { nome, cpf, crm, genero, data_nascimento } = req.body;

            // Check se CPF já existe
            if (cpf) {
                const existenteCPF = await Participante.findOne({ where: { cpf } });
                if (existenteCPF) return res.status(400).json({ error: "CPF já cadastrado." });
            }

            if (crm) {
                const existenteCRM = await Participante.findOne({ where: { crm } });
                if (existenteCRM) return res.status(400).json({ error: "CRM já cadastrado." });
            }

            const participante = await Participante.create({
                nome, cpf, crm, genero, data_nascimento, ativo: true
            });

            res.json({ success: true, participante, msg: "Participante criado com sucesso." });
        } catch (e) {
            console.error("Erro ao criar participante:", e);
            res.status(500).json({ error: "Erro ao criar participante", details: e.message });
        }
    }

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            console.log(`📥 [ParticipanteController] Atualizando participante ${id}:`, req.body);
            const { nome, cpf, crm, genero, data_nascimento } = req.body;

            const participante = await Participante.findByPk(id);
            if (!participante) return res.status(404).json({ error: "Participante não encontrado." });

            if (cpf && cpf !== participante.cpf) {
                const existenteCPF = await Participante.findOne({ where: { cpf } });
                if (existenteCPF) return res.status(400).json({ error: "CPF já cadastrado em outro participante." });
            }

            if (crm && crm !== participante.crm) {
                const existenteCRM = await Participante.findOne({ where: { crm } });
                if (existenteCRM) return res.status(400).json({ error: "CRM já cadastrado em outro participante." });
            }

            participante.nome = nome;
            participante.cpf = cpf;
            participante.crm = crm;
            participante.genero = genero;
            participante.data_nascimento = data_nascimento;

            console.log("💾 [ParticipanteController] Salvando objeto:", participante.toJSON ? participante.toJSON() : participante);
            await participante.save();

            res.json({ success: true, participante, msg: "Dados atualizados com sucesso." });
        } catch (e) {
            console.error("Erro ao atualizar participante:", e);
            res.status(500).json({ error: "Erro ao atualizar participante", details: e.message });
        }
    }

    async excluir(req, res) {
        try {
            const { id } = req.params;
            const participante = await Participante.findByPk(id);
            if (!participante) return res.status(404).json({ error: "Participante não encontrado." });

            // Desativar apenas, conforme política de retenção biométrica
            participante.ativo = false;
            await participante.save();

            res.json({ success: true, msg: "Participante desativado com sucesso (biometria preservada)." });
        } catch (e) {
            console.error("Erro ao remover participante:", e);
            res.status(500).json({ error: "Erro ao remover participante", details: e.message });
        }
    }

    async atualizarBiometria(req, res) {
        try {
            const { id } = req.params;
            const { template } = req.body;

            if (!template) return res.status(400).json({ error: "Template biométrico não fornecido." });

            const participante = await Participante.findByPk(id);
            if (!participante) return res.status(404).json({ error: "Participante não encontrado." });

            participante.template_biometrico = template;
            participante.data_biometria = new Date();
            participante.ativo = true;
            await participante.save();

            res.json({ success: true, msg: "Biometria atualizada com sucesso." });
        } catch (e) {
            console.error("Erro ao atualizar biometria:", e);
            res.status(500).json({ error: "Erro ao atualizar biometria", details: e.message });
        }
    }

    async syncStatus(req, res) {
        try {
            const ultimoSync = await HistoricoSincronizacao.findOne({
                order: [['data_sync', 'DESC']]
            });
            if (!ultimoSync) {
                return res.json({ status: 'nenhum_registro' });
            }
            res.json(ultimoSync);
        } catch (e) {
            console.error("Erro ao buscar status de sincronização:", e);
            res.status(500).json({ error: "Erro ao buscar status", details: e.message });
        }
    }

    async forceSync(req, res) {
        try {
            const result = await SyncParticipantesService.sync();
            if (result.sucesso) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (e) {
            console.error("Erro no force sync:", e);
            res.status(500).json({ error: "Erro na sincronização manual", details: e.message });
        }
    }

    async enriquecimentoStatus(req, res) {
        try {
            const total  = await Participante.count({ where: { ativo: true } });
            const pendentes = await Participante.count({
                where: {
                    ativo: true,
                    [Op.or]: [
                        { genero: 'O' },
                        { data_nascimento: null }
                    ]
                }
            });
            const enriquecidos = total - pendentes;
            const percentual   = total > 0 ? Math.round((enriquecidos / total) * 100) : 0;

            res.json({
                total,
                enriquecidos,
                pendentes,
                percentual,
                completo: pendentes === 0
            });
        } catch (e) {
            console.error("Erro ao buscar status de enriquecimento:", e);
            res.status(500).json({ error: "Erro ao buscar status", details: e.message });
        }
    }
}

module.exports = new ParticipanteController();
