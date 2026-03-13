const { Evento } = require('./backend/src/models');

async function testList() {
    try {
        const eventos = await Evento.findAll();
        console.log(JSON.stringify(eventos, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testList();
