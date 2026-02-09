const { RegistroAcesso } = require('./src/models');

async function inspectAccess() {
    try {
        console.log("Inspecting RegistroAcesso...");
        const logs = await RegistroAcesso.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']]
        });
        console.log("Found", logs.length, "records.");
        logs.forEach(l => {
            console.log(`ID: ${l.id}, EventoId: ${l.EventoId}, ParticipanteId: ${l.ParticipanteId}, Status: ${l.status_validacao}, Tipo: ${l.tipo_acesso}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

inspectAccess();
