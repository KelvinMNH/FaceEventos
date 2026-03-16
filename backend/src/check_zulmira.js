const { RegistroAcesso, Participante } = require('./models');

async function checkZulmiraLogs() {
    console.log('--- Analisando Tentativas de Zulmira (ID 36) ---');
    const logs = await RegistroAcesso.findAll({
        where: { ParticipanteId: 36 },
        limit: 10,
        order: [['createdAt', 'DESC']]
    });

    if (logs.length === 0) {
        // Se não houver logs vinculados ao ID 36, talvez as falhas não tenham ID vinculado
        console.log('Nenhum log vinculado ao ID 36 encontrado. Buscando por "nao_encontrado" recentes...');
        const failLogs = await RegistroAcesso.findAll({
            where: { status_validacao: 'nao_encontrado' },
            limit: 5,
            order: [['createdAt', 'DESC']]
        });
        failLogs.forEach(l => console.log(`Log: ${l.createdAt.toISOString()} | Status: ${l.status_validacao} | Device: ${l.device_id}`));
    } else {
        logs.forEach(l => {
            console.log(`Log: ${l.createdAt.toISOString()} | Status: ${l.status_validacao} | Tipo: ${l.tipo_acesso}`);
        });
    }

    process.exit(0);
}

checkZulmiraLogs().catch(err => { console.error(err); process.exit(1); });
