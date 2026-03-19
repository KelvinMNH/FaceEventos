const { RegistroAcesso, Participante, Evento } = require('./src/models');
const sequelize = require('./src/config/database');

async function debugDB() {
    try {
        const logs = await RegistroAcesso.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [Participante, Evento]
        });

        console.log('--- ULTIMOS 10 LOGS ---');
        logs.forEach(l => {
            console.log(`ID: ${l.id} | Tipo: ${l.tipo_acesso} | Status: ${l.status_validacao} | Evento: ${l.Evento?.nome} (${l.EventoId}) | Participante: ${l.Participante?.nome} (${l.ParticipanteId})`);
        });

        const activeEvent = await Evento.findOne({ where: { status: 'ativo' } });
        if (activeEvent) {
            console.log(`\n--- EVENTO ATIVO: ${activeEvent.nome} (${activeEvent.id}) ---`);
            const count = await RegistroAcesso.count({
                where: { 
                    EventoId: activeEvent.id,
                    tipo_acesso: 'entrada',
                    status_validacao: 'sucesso'
                }
            });
            console.log(`Contagem de entradas sucesso: ${count}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

debugDB();
