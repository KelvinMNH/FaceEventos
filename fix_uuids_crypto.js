const { Evento } = require('./backend/src/models');
const crypto = require('crypto');

async function fix() {
    try {
        console.log("🔍 Verificando integridade dos UUIDs (versão crypto)...");
        const eventos = await Evento.findAll();
        let fixCount = 0;
        
        for (const e of eventos) {
            // Um UUID válido tem 36 caracteres e contém hifens
            const isValid = e.uuid && e.uuid.length === 36 && e.uuid.includes('-');
            if (!isValid) {
                const oldUuid = e.uuid || 'NULL';
                const newUuid = crypto.randomUUID();
                console.log(`🛠️ Corrigindo Evento ID ${e.id}: [${oldUuid}] -> [${newUuid}]`);
                e.uuid = newUuid;
                await e.save();
                fixCount++;
            } else {
                console.log(`✅ Evento ID ${e.id} OK: [${e.uuid}]`);
            }
        }
        
        console.log(`✅ Concluído. ${fixCount} corrigidos. Total: ${eventos.length}`);
        process.exit(0);
    } catch (e) {
        console.error("❌ Erro:", e);
        process.exit(1);
    }
}

fix();
