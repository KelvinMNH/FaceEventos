const { Evento } = require('./backend/src/models');

async function check() {
    try {
        const eventos = await Evento.findAll();
        eventos.forEach(e => {
            console.log(`ID: ${e.id} | UUID: [${e.uuid}] | LEN: ${e.uuid ? e.uuid.length : 'N/A'}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
