const { Evento, Participante, Acompanhante, RegistroAcesso } = require('../models');
const { Op } = require('sequelize');
const { Jimp, distance, diff } = require('jimp');

// Helper para converter RAW grayscale em Jimp Image
async function createJimpFromRaw(base64, width, height) {
    const buffer = Buffer.from(base64, 'base64');
    // Criar nova imagem preta
    const image = new Jimp(width, height);

    // Preencher bitmap (RAW 1 byte -> RGBA 4 bytes)
    for (let i = 0; i < width * height; i++) {
        const val = buffer[i];
        const idx = i * 4;
        image.bitmap.data[idx] = val;     // R
        image.bitmap.data[idx + 1] = val; // G
        image.bitmap.data[idx + 2] = val; // B
        image.bitmap.data[idx + 3] = 255; // Alpha
    }
    return image;
}

class AcessoController {
    async scan(req, res) {
        const { device_id, template, width, height, force_match_id, check_only, eventoId } = req.body;
        // console.log(`[Scan] Recebido: ${width}x${height} - Force: ${force_match_id} - Evento: ${eventoId}`);

        try {
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ autorizado: false, mensagem: "Este evento não está ativo para novos registros." });
            }

            let participante = null;

            if (force_match_id) {
                participante = await Participante.findByPk(force_match_id);
            } else {
                // --- BIOMETRIA POR SIMILARIDADE (FUZZY MATCH) ---
                console.log(`[Scan] Validando dimensões: W=${width} H=${height}`);

                if (!width || !height) {
                    // Fallback no backend se vier zerado
                    // Mas se realmente falhar, mudar mensagem para usuário
                    return res.json({ autorizado: false, mensagem: "Erro na leitura biométrica (Tente novamente)" });
                }

                const probeImage = await createJimpFromRaw(template, width, height);
                const candidates = await Participante.findAll({
                    where: {
                        template_biometrico: { [Op.ne]: null },
                        ativo: true
                    }
                });

                let bestMatch = null;
                let lowestDistance = 1.0; // 1.0 = 100% diferente

                // console.log(`[Scan] Comparando com ${candidates.length} candidatos...`);

                for (const cand of candidates) {
                    try {
                        // O template salvo no banco deve ter o mesmo formato (RAW Base64)
                        // Assumimos que foi salvo com o mesmo leitor/dimensões.
                        // Se não tiver width/height salvos, assumimos o do probe (arriscado, mas por hora ok)
                        if (!cand.template_biometrico || cand.template_biometrico.startsWith('manual_')) continue;

                        const candImage = await createJimpFromRaw(cand.template_biometrico, width, height);

                        // Jimp.distance: 0 = idêntico, 1 = muito diferente
                        const dist = distance(probeImage, candImage);
                        const difference = diff(probeImage, candImage); // diff.percent

                        // Combinar métricas se quiser, ou usar só distance
                        // console.log(`[Scan] Cand ${cand.nome}: Dist ${dist.toFixed(4)} Diff ${difference.percent.toFixed(4)}`);

                        if (dist < 0.15 && dist < lowestDistance) { // Limiar 15%
                            lowestDistance = dist;
                            bestMatch = cand;
                        }
                    } catch (err) {
                        console.error(`Erro ao comparar candidato ${cand.id}:`, err.message);
                    }
                }

                if (bestMatch) {
                    console.log(`[Scan] MATCH! ${bestMatch.nome} (S: ${(1 - lowestDistance).toFixed(2)})`);
                    participante = bestMatch;
                }
            }

            // Se for apenas verificação (para checkout ou busca)
            if (check_only) {
                if (participante) {
                    return res.json({
                        autorizado: true,
                        participante: { id: participante.id, nome: participante.nome, cpf: participante.cpf, crm: participante.crm },
                        mensagem: "Identificado com sucesso"
                    });
                } else {
                    return res.json({ autorizado: false, mensagem: "Biometria não reconhecida" });
                }
            }

            // Verificação de dupla entrada
            if (participante) {
                const ultimoLog = await RegistroAcesso.findOne({
                    where: { EventoId: evento.id, ParticipanteId: participante.id },
                    order: [['createdAt', 'DESC']]
                });

                if (ultimoLog && ultimoLog.tipo_acesso === 'entrada' && ultimoLog.status_validacao === 'sucesso') {
                    // Log tentativa duplicada mas não cria registro de sucesso
                    await RegistroAcesso.create({
                        tipo_acesso: 'entrada',
                        status_validacao: 'falha', // duplicado
                        device_id: device_id || 'unknown',
                        EventoId: evento.id,
                        ParticipanteId: participante.id
                    });

                    return res.json({
                        autorizado: false,
                        mensagem: `Participante já validado! (${participante.nome})`,
                        participante: { nome: participante.nome }
                    });
                }
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
                    participante: { nome: participante.nome, cpf: participante.cpf, crm: participante.crm },
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
        try {
            const { eventoId } = req.body;
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Este evento não está ativo para simulações." });
            }

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
            console.error("Erro na simulação:", e);
            res.status(500).json({ error: "Erro na simulação", details: e.message });
        }
    }

    async manualEntry(req, res) {
        try {
            const { query, participanteId, eventoId } = req.body;
            const evento = eventoId 
                ? await Evento.findOne({ where: { uuid: eventoId } })
                : await Evento.findOne({ where: { status: 'ativo' } });
            
            if (!evento || evento.status !== 'ativo') {
                return res.json({ success: false, msg: "Este evento não está ativo para registros manuais." });
            }

            let participante = null;

            if (participanteId) {
                participante = await Participante.findByPk(participanteId);
            } else if (query) {
                participante = await Participante.findOne({
                    where: {
                        [Op.or]: [
                            { cpf: query },
                            { crm: query },
                            { nome: { [Op.like]: `%${query}%` } }
                        ]
                    }
                });
            }

            if (!participante) return res.json({ success: false, msg: "Participante não encontrado", not_found: true });

            // Verificação de dupla entrada Manual
            const ultimoLog = await RegistroAcesso.findOne({
                where: { EventoId: evento.id, ParticipanteId: participante.id },
                order: [['createdAt', 'DESC']]
            });

            if (ultimoLog && ultimoLog.tipo_acesso === 'entrada' && ultimoLog.status_validacao === 'sucesso') {
                return res.json({ success: false, msg: "Participante já validado neste evento!", already_in: true });
            }

            await RegistroAcesso.create({
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso',
                device_id: 'manual_entry_web',
                EventoId: evento.id,
                ParticipanteId: participante.id
            });

            res.json({ success: true, status: 'sucesso', participante });
        } catch (e) {
            console.error("Erro na entrada manual:", e);
            res.status(500).json({ error: "Erro na entrada manual", details: e.message });
        }
    }

    async renovarBiometriaEEntrar(req, res) {
        try {
            const { participanteId, template, eventoId } = req.body;
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
            participante.ativo = true;
            await participante.save();

            // Verificação de dupla entrada Manual
            const ultimoLog = await RegistroAcesso.findOne({
                where: { EventoId: evento.id, ParticipanteId: participante.id },
                order: [['createdAt', 'DESC']]
            });

            if (ultimoLog && ultimoLog.tipo_acesso === 'entrada' && ultimoLog.status_validacao === 'sucesso') {
                return res.json({
                    success: false,
                    autorizado: false,
                    msg: "Biometria atualizada, mas participante já validado neste evento!",
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
                participante: { id: participante.id, nome: participante.nome, cpf: participante.cpf, crm: participante.crm, genero: participante.genero, data_nascimento: participante.data_nascimento },
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
            const { nome, cpf, crm, genero, data_nascimento, eventoId } = req.body;
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
                limit: eventoUuid ? 50000 : 1000, // Limite de 50k para eventos (seguro para browsers e servidores)
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
}

module.exports = new AcessoController();
