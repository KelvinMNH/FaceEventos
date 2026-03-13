const { Evento } = require('./backend/src/models');

async function checkUuids() {
    try {
        const eventos = await Evento.findAll({ attributes: ['id', 'nome', 'uuid'] });
        console.log(JSON.stringify(eventos, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Erro ao verificar UUIDs:', error);
        process.exit(1);
    }
}

checkUuids();
