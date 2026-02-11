// TEST DIRECTLY via Controller to avoid Auth issues
const AcessoController = require('./src/controllers/AcessoController');
const { Evento, RegistroAcesso, Participante } = require('./src/models');

async function testDirectController() {
    try {
        console.log('--- Testing AcessoController.scan directly ---');

        // Mock Request/Response
        const req = {
            body: {
                device_id: 'test_script',
                template: 'SGVsbG8gV29ybGQ=', // Invalid base64 image data to trigger failure/no match
                width: 100,
                height: 100
            },
            user: { id: 1, perfil: 'admin' } // Mock auth user
        };

        const res = {
            json: (data) => {
                console.log('Response JSON:', JSON.stringify(data, null, 2));
                return data;
            },
            status: (code) => {
                console.log('Response Status:', code);
                return { json: (d) => console.log('Response JSON (after status):', JSON.stringify(d, null, 2)) };
            }
        };

        // Ensure active event
        const evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) {
            console.log('No active event, cannot test.');
            return;
        }
        console.log(`Active Event: ${evento.nome} (${evento.id})`);

        // Run scan
        await AcessoController.scan(req, res);

        // Check logs
        const lastLog = await RegistroAcesso.findOne({
            order: [['createdAt', 'DESC']],
            limit: 1
        });

        if (lastLog) {
            console.log(`Last Log ID: ${lastLog.id}`);
            console.log(`Status: ${lastLog.status_validacao}`);
            console.log(`Device: ${lastLog.device_id}`);
            console.log(`Type: ${lastLog.tipo_acesso}`);
        } else {
            console.log('No logs found after scan!');
        }

        // List the 20 logs for duplicate check
        console.log('\n--- Checking the existing logs for active event ---');
        const logs = await RegistroAcesso.findAll({
            where: { EventoId: evento.id, status_validacao: 'sucesso' },
            include: [{ model: Participante, attributes: ['nome'] }],
            order: [['createdAt', 'ASC']]
        });

        const counts = {};
        logs.forEach(l => {
            const name = l.Participante ? l.Participante.nome : 'Unknown';
            counts[name] = (counts[name] || 0) + 1;
        });

        Object.entries(counts).forEach(([name, count]) => {
            if (count > 1) console.log(`DUPLICATE: ${name}: ${count} times`);
        });
        console.log(`Total Success Logs: ${logs.length}`);

    } catch (e) {
        console.error('Test failed:', e);
    }
}

testDirectController();
