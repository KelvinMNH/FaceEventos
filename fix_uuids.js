const { Evento } = require('./backend/src/models');
const { v4: uuidv4 } = require('uuid');

async function fix() {
    try {
        console.log("🔍 Verificando integridade dos UUIDs...");
        const eventos = await Evento.findAll();
        let fixCount = 0;
        
        for (const e of eventos) {
            const isInvalid = !e.uuid || e.uuid.length !== 36 || !e.uuid.includes('-');
            if (isInvalid) {
                const oldUuid = e.uuid || 'NULL';
                const newUuid = uuidv4();
                console.log(`🛠️ Corrigindo Evento ID ${e.id}: [${oldUuid}] -> [${newUuid}]`);
                e.uuid = newUuid;
                await e.save();
                fixCount++;
            }
        }
        
        console.log(`✅ Concluído. ${fixCount} eventos corrigidos. Total de eventos: ${eventos.length}`);
        process.exit(0);
    } catch (e) {
        console.error("❌ Erro ao fixar UUIDs:", e);
        process.exit(1);
    }
}

fix();
