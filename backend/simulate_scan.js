const { RegistroAcesso, Participante, Evento } = require('./src/models');
const sequelize = require('./src/config/database');

async function simulateScan() {
    try {
        // Encontrar o último participante que tem uma entrada sucesso
        const lastSuccess = await RegistroAcesso.findOne({
            where: { tipo_acesso: 'entrada', status_validacao: 'sucesso' },
            order: [['createdAt', 'DESC']],
            include: [Participante, Evento]
        });

        if (!lastSuccess) {
            console.log("Nenhum log de sucesso encontrado para simular.");
            return;
        }

        const { ParticipanteId, EventoId } = lastSuccess;
        console.log(`Simulando scan para Participante ${ParticipanteId} no Evento ${EventoId}`);

        // Agora simular o que o controller faz
        const entradaExistente = await RegistroAcesso.findOne({
            where: { 
                EventoId: EventoId, 
                ParticipanteId: ParticipanteId,
                tipo_acesso: 'entrada',
                status_validacao: 'sucesso'
            }
        });

        if (entradaExistente) {
            console.log("✅ ENTRADA EXISTENTE ENCONTRADA!");
            console.log(`Record ID: ${entradaExistente.id}`);
        } else {
            console.log("❌ ERRO: ENTRADA EXISTENTE NÃO ENCONTRADA!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

simulateScan();
