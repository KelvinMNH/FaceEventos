const { Evento, Participante, Acompanhante, RegistroAcesso } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const DEBUG_LOG = path.join(__dirname, '../../biometria_debug.log');
function logDebug(msg) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${msg}\n`);
}

class AcessoController {
    async scan(req, res) {
        const { device_id, force_match_id, identified_id, check_only, eventId } = req.body;
        
        try {
            const evento = eventId 
                ? await Evento.findOne({ where: { uuid: eventId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ autorizado: false, mensagem: "Este evento não está ativo." });
            }

            let participante = null;

            if (force_match_id || identified_id) {
                participante = await Participante.findByPk(force_match_id || identified_id);
                // Se for apenas verificação (para checkout ou busca)
                if (check_only) {
                    if (participante) {
                        return res.json({
                            autorizado: true,
                            participante: { 
                                id: participante.id, 
                                nome: participante.nome, 
                                cpf: participante.cpf, 
                                crm: participante.crm,
                                foto_biometria: participante.foto_biometria 
                            },
                            mensagem: "Identificado com sucesso"
                        });
                    } else {
                        return res.json({ autorizado: false, mensagem: "Biometria não reconhecida" });
                    }
                }
            }

            // Verificação de duplicidade (Bloqueia re-entrada se já houver qualquer entrada de sucesso)
            // Verificação de duplicidade (Bloqueia re-entrada se já houver qualquer entrada de sucesso)
            if (participante) {
                const eid = Number(evento.id);
                const pid = Number(participante.id);
                
                logDebug(`[SCAN] Investigando Participante=${pid} no Evento=${eid}`);

                // Busca por qualquer registro de sucesso preexistente para este participante e evento
                const entradaExistente = await RegistroAcesso.findOne({
                    where: { 
                        EventoId: eid, 
                        ParticipanteId: pid,
                        tipo_acesso: 'entrada',
                        status_validacao: 'sucesso'
                    },
                    order: [['id', 'DESC']],
                    raw: true
                });

                if (entradaExistente) {
                    logDebug(`Duplicidade detectada para Participante ${pid}. Log ID Existente: ${entradaExistente.id}`);
                    // Log tentativa duplicada mas não cria registro de sucesso
                    await RegistroAcesso.create({
                        tipo_acesso: 'entrada',
                        status_validacao: 'falha', // duplicado
                        device_id: device_id || 'unknown',
                        EventoId: eid,
                        ParticipanteId: pid
                    });

                    return res.json({
                        autorizado: false,
                        already_in: true,
                        mensagem: "Participante já registrado no evento!",
                        participante: { 
                            id: participante.id,
                            nome: participante.nome, 
                            foto_biometria: participante.foto_biometria 
                        }
                    });
                }
            }

            const status = participante ? 'sucesso' : 'nao_encontrado';
            logDebug(`Processando novo registro. Status: ${status} | Participante: ${participante?.id || 'null'}`);
            
            const acesso = await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: status,
                device_id: device_id || 'unknown',
                EventoId: Number(evento.id),
                ParticipanteId: participante ? Number(participante.id) : null
            });

            if (participante) {
                return res.json({
                    autorizado: true,
                    participante: { 
                        id: participante.id,
                        nome: participante.nome, 
                        cpf: participante.cpf, 
                        crm: participante.crm, 
                        foto_biometria: participante.foto_biometria 
                    },
                    mensagem: "Acesso Permitido",
                    access_id: acesso.id
                });
            } else {
                return res.json({ autorizado: false, mensagem: "Biometria não reconhecida", access_id: acesso.id });
            }
        } catch (error) {
            console.error("Erro no scan:", error);
            res.status(500).json({ error: "Erro interno" });
        }
    }

    async simulate(req, res) {
        res.status(410).json({ success: false, message: "Funcionalidade de simulação desativada." });
    }

    async manualEntry(req, res) {
        try {
            const { query, participanteId, eventoId } = req.body;
            
            // Busca o evento de forma otimizada (apenas IDs e Status necessários)
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId }, attributes: ['id', 'status'], raw: true })
                : await Evento.findOne({ where: { status: 'ativo' }, attributes: ['id', 'status'], raw: true });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Evento não encontrado ou inativo." });
            }

            let participante = null;

            if (participanteId) {
                participante = await Participante.findByPk(participanteId, { raw: true });
            } else if (query) {
                const lowerQuery = query.toLowerCase();
                const digitsQuery = query.replace(/\D/g, '');
                participante = await Participante.findOne({
                    where: {
                        [Op.or]: [
                            sequelize.where(sequelize.fn('LOWER', sequelize.col('cpf')), { [Op.like]: `%${digitsQuery || lowerQuery}%` }),
                            sequelize.where(sequelize.fn('LOWER', sequelize.col('crm')), { [Op.like]: `%${lowerQuery}%` }),
                            sequelize.where(sequelize.fn('LOWER', sequelize.col('nome')), { [Op.like]: `%${lowerQuery}%` })
                        ]
                    },
                    raw: true
                });
            }

            if (!participante) return res.json({ success: false, msg: "Participante não encontrado", not_found: true });

            // Verificação de duplicidade Manual otimizada (apenas id)
            const entradaExistente = await RegistroAcesso.findOne({
                where: { 
                    EventoId: evento.id, 
                    ParticipanteId: participante.id,
                    tipo_acesso: 'entrada',
                    status_validacao: 'sucesso'
                },
                attributes: ['id'],
                raw: true
            });

            if (entradaExistente) {
                return res.json({ success: false, msg: "Participante já possui entrada registrada!", already_in: true });
            }

            // Cria o registro e retorna imediatamente o sucesso
            await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso',
                device_id: 'manual_entry_web',
                EventoId: evento.id,
                ParticipanteId: participante.id
            });

            return res.json({ success: true, status: 'sucesso', participante });
        } catch (e) {
            console.error("Erro na entrada manual:", e);
            res.status(500).json({ error: "Erro na entrada manual", details: e.message });
        }
    }

    async renovarBiometriaEEntrar(req, res) {
        try {
            const { participanteId, template, foto, eventoId } = req.body;
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Este evento não está ativo para renovação e entrada." });
            }

            if (!participanteId || !template) {
                return res.json({ success: false, autorizado: false, msg: "Dados inválidos para renovação" });
            }

            const participante = await Participante.findByPk(participanteId);
            if (!participante) return res.json({ success: false, autorizado: false, msg: "Participante não encontrado" });

            // Atualiza a biometria
            participante.template_biometrico = template;
            if (foto) participante.foto_biometria = foto;
            participante.data_biometria = new Date();
            participante.ativo = true;
            await participante.save();

            // Verificação de duplicidade na Renovação
            const entradaExistente = await RegistroAcesso.findOne({
                where: { 
                    EventoId: evento.id, 
                    ParticipanteId: participante.id,
                    tipo_acesso: 'entrada',
                    status_validacao: 'sucesso'
                }
            });

            if (entradaExistente) {
                return res.json({
                    success: false,
                    autorizado: false,
                    msg: "Biometria atualizada, mas participante já possui entrada registrada!",
                    already_in: true,
                    participante: { nome: participante.nome, cpf: participante.cpf, crm: participante.crm }
                });
            }

            const acesso = await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso',
                device_id: 'manual_bio_update',
                EventoId: evento.id,
                ParticipanteId: participante.id
            });

            // Retorno tem formato compatível com scan e manual-entry
            res.json({
                success: true, // compatibilidade entry
                autorizado: true, // compatibilidade scan
                status: 'sucesso',
                participante: { id: participante.id, nome: participante.nome, cpf: participante.cpf, crm: participante.crm, genero: participante.genero, data_nascimento: participante.data_nascimento, foto_biometria: participante.foto_biometria },
                mensagem: "Biometria cadastrada e Acesso Permitido",
                access_id: acesso.id
            });
        } catch (e) {
            console.error("Erro na renovação biométrica:", e);
            res.status(500).json({ error: "Erro na renovação", details: e.message });
        }
    }

    async cadastrarEntrada(req, res) {
        try {
            const { nome, cpf, crm, genero, data_nascimento, eventoId, template_biometrico, foto } = req.body;
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Este evento não está ativo para novos cadastros." });
            }

            let participante = await Participante.findOne({ where: { cpf } });
            if (participante) return res.json({ success: false, msg: "CPF já cadastrado." });

            participante = await Participante.create({
                nome, cpf, crm, genero: genero || 'Outro', data_nascimento,
                ativo: true, 
                template_biometrico: template_biometrico || ('manual_' + Date.now()),
                foto_biometria: foto,
                data_biometria: new Date()
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
            console.error("Erro ao cadastrar entrada:", e);
            res.status(500).json({ error: "Erro ao cadastrar entrada", details: e.message });
        }
    }

    async registrarSaida(req, res) {
        try {
            const { participanteId, eventoId } = req.body;
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Este evento não está ativo para registros de saída." });
            }
            if (!evento.habilitar_checkout) return res.json({ success: false, msg: "Este evento não permite checkout" });

            const participante = await Participante.findByPk(participanteId);
            if (!participante) return res.json({ success: false, msg: "Participante não encontrado" });

            // Verificar o ÚLTIMO status do participante neste evento (para permitir reentradas)
            const ultimoLog = await RegistroAcesso.findOne({
                where: { EventoId: evento.id, ParticipanteId: participante.id },
                order: [['createdAt', 'DESC']]
            });

            // Se não tem log ou o último foi SAÍDA, não pode fazer checkout
            if (!ultimoLog || ultimoLog.tipo_acesso === 'saida') {
                if (ultimoLog && ultimoLog.tipo_acesso === 'saida') {
                    return res.json({ success: false, msg: "Checkout já realizado (Usuário já saiu)", already_checked_out: true });
                } else {
                    return res.json({ success: false, msg: "Participante não possui entrada registrada." });
                }
            }

            await RegistroAcesso.create({
                tipo_acesso: 'saida',
                status_validacao: 'sucesso',
                device_id: 'checkout_totem',
                EventoId: evento.id,
                ParticipanteId: participanteId
            });

            // --- CHECKOUT EM CASCATA PARA ACOMPANHANTES ---
            const acompanhantes = await Acompanhante.findAll({
                where: { ParticipanteId: participanteId }
            });

            for (const ac of acompanhantes) {
                // Verificar se o último log deste acompanhante foi entrada
                const ultimoLogAc = await RegistroAcesso.findOne({
                    where: { EventoId: evento.id, AcompanhanteId: ac.id },
                    order: [['createdAt', 'DESC']]
                });

                if (ultimoLogAc && ultimoLogAc.tipo_acesso === 'entrada') {
                    await RegistroAcesso.create({
                        tipo_acesso: 'saida',
                        status_validacao: 'sucesso',
                        device_id: 'auto_cascade_checkout',
                        EventoId: evento.id,
                        AcompanhanteId: ac.id
                    });
                }
            }

            res.json({ success: true, participante });
        } catch (e) {
            console.error("Erro ao registrar saída:", e);
            res.status(500).json({ error: "Erro ao registrar saída", details: e.message });
        }
    }

    async getLogs(req, res) {
        try {
            const { eventoUuid } = req.query;
            const whereClause = {};
            const eventInclude = { model: Evento, attributes: ['nome', 'uuid'] };

            if (eventoUuid) {
                eventInclude.where = { uuid: eventoUuid };
            }

            const logs = await RegistroAcesso.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit: eventoUuid ? 2000 : 1000, 
                include: [
                    { model: Participante, attributes: ['id', 'nome', 'cpf', 'crm', 'genero', 'data_nascimento'] },
                    { model: Acompanhante, attributes: ['id', 'nome', 'ParticipanteId'] },
                    eventInclude
                ]
            });
            res.json(logs);
        } catch (error) {
            console.error("Erro ao buscar logs:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async candidates(req, res) {
        try {
            const candidates = await Participante.findAll({
                where: {
                    template_biometrico: { [Op.ne]: null },
                    ativo: true
                },
                attributes: ['id', 'nome', 'template_biometrico']
            });

            // Filtrar apenas os que possuem template oficial (base64 longo, não manual_)
            const oficialCandidates = candidates.filter(c => 
                c.template_biometrico && !c.template_biometrico.startsWith('manual_')
            );

            res.json(oficialCandidates);
        } catch (error) {
            console.error("Erro ao buscar candidatos:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async compare(req, res) {
        res.status(410).json({ success: false, message: "Funcionalidade de biometria digital desativada. Use Reconhecimento Facial." });
    }
}

module.exports = new AcessoController();
