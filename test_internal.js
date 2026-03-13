const { EventoController } = require('./backend/src/controllers/EventoController');
// Note: EventoController is an instance (module.exports = new EventoController())
const controller = require('./backend/src/controllers/EventoController');

async function testInternal() {
    const uuid = 'afc8eaf1-e717-415a-9049-3c381d3376c9';
    console.log(`🧪 Testando busca interna para UUID: ${uuid}`);

    const req = {
        params: { uuid }
    };

    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.data = data;
            return this;
        }
    };

    try {
        await controller.buscarPorUuid(req, res);
        console.log(`STATUS: ${res.statusCode || 200}`);
        console.log(`DATA: ${JSON.stringify(res.data)}`);
    } catch (e) {
        console.error("ERRO NO TESTE:", e);
    }
    process.exit();
}

testInternal();
