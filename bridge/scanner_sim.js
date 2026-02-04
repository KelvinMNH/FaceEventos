const axios = require('axios');

const API_URL = 'http://localhost:3000/api/scan';

async function simulateScan(template, forceId) {
    console.log(`Simulando leitura biométrica... [Template: ${template}]`);

    try {
        const payload = {
            device_id: 'READER_01',
            template: template,
            force_match_id: forceId // Opcional, para facilitar testes
        };

        const response = await axios.post(API_URL, payload);

        console.log('--- Resposta do Servidor ---');
        console.log(`Autorizado: ${response.data.autorizado}`);
        console.log(`Mensagem: ${response.data.mensagem}`);
        if (response.data.participante) {
            console.log(`Participante: ${response.data.participante.nome}`);
        }
        console.log('----------------------------');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error("Erro: Não foi possível conectar ao Backend. Verifique se ele está rodando na porta 3000.");
        } else {
            console.error("Erro na requisição:", error.message);
        }
    }
}

// Ler argumentos da linha de comando
// node scanner_sim.js "bio_kelvin_123"
// node scanner_sim.js --id 1

const args = process.argv.slice(2);
if (args.length > 0) {
    const arg1 = args[0];
    if (arg1 === '--id') {
        simulateScan('template_dummy', args[1]);
    } else {
        simulateScan(arg1, null);
    }
} else {
    console.log("Uso: node scanner_sim.js <template_string>");
    console.log("Ou:  node scanner_sim.js --id <id_participante>");

    // Teste padrão
    simulateScan('bio_kelvin_123', null);
}
