const { Evento, RegistroAcesso, Participante } = require('./src/models');

async function inspect() {
    try {
        const events = await Evento.findAll();
        const activeEvent = events.find(e => e.status === 'ativo');

        if (activeEvent) {
            console.log(`\n--- Detalhes Logs Evento: ${activeEvent.nome} (${activeEvent.id}) ---`);
            const logs = await RegistroAcesso.findAll({
                where: { EventoId: activeEvent.id },
                include: [{ model: Participante, attributes: ['nome'] }],
                order: [['createdAt', 'ASC']]
            });

            logs.forEach(l => {
                const nome = l.Participante ? l.Participante.nome : 'Desconhecido';
                console.log(`[${l.id}] ${l.createdAt.toISOString()} - ${l.tipo_acesso} - ${l.status_validacao} - ${nome}`);
            });
        }

        console.log('\n--- Últimos 10 Logs Gerais ---');
        const lastLogs = await RegistroAcesso.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [{ model: Evento, attributes: ['nome'] }]
        });

        lastLogs.forEach(l => {
            const evt = l.Evento ? l.Evento.nome : 'Sem Evento';
            console.log(`[${l.id}] ${l.createdAt.toISOString()} - Evento: ${evt} - Status: ${l.status_validacao}`);
        });

    } catch (e) {
        console.error(e);
    }
}

inspect();
