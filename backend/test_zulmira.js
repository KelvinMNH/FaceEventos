const { Participante, RegistroAcesso, Evento } = require('./src/models');
const AcessoController = require('./src/controllers/AcessoController');
const { Op } = require('sequelize');

async function testZulmiraScan() {
    try {
        console.log('--- Testando Reconhecimento de Zulmira (Busca por nome) ---');
        const p = await Participante.findOne({
            where: { nome: { [Op.like]: '%Zulmira%' } }
        });
        
        if (!p || !p.template_biometrico) {
            console.error('Participante ou template não encontrado!');
            process.exit(1);
        }

        console.log(`Encontrado: ${p.nome} (ID: ${p.id})`);
        const buffer = Buffer.from(p.template_biometrico, 'base64');
        console.log(`Template Buffer Length: ${buffer.length}`);

        // Simular o que o totem (bridge) envia: 320x480
        let w = 320;
        let h = 480;
        
        console.log(`Simulando Totem (bridge) enviando: ${w}x${h}`);
        console.log(`Template tem ${buffer.length} bytes (provavelmente 320x640)`);

        const req = {
            body: {
                template: p.template_biometrico,
                width: w,
                height: h,
                device_id: 'test_zulmira_sim',
                eventoId: null
            }
        };

        const res = {
            json: (data) => {
                console.log('Resultado do Scan:', JSON.stringify(data, null, 2));
                return data;
            },
            status: (code) => {
                console.log('Status HTTP:', code);
                return res;
            }
        };

        await AcessoController.scan(req, res);
        process.exit(0);
    } catch (e) {
        console.error('Erro no teste:', e);
        process.exit(1);
    }
}

testZulmiraScan();
