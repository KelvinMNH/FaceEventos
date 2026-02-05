const http = require('http');

// Configuração
const API_HOST = 'localhost';
const API_PORT = 3000;
const INTERVAL_MS = 10000; // 10 segundos

console.log("Iniciando Simulação de Biometria Automática...");
console.log(`Intervalo: ${INTERVAL_MS / 1000} segundos.`);
console.log("Pressione Ctrl+C para parar.");

function sendScan(data) {
    const postData = JSON.stringify(data);

    const options = {
        hostname: API_HOST,
        port: API_PORT,
        path: '/api/scan',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            // Apenas logar status simples
            try {
                const json = JSON.parse(responseData);
                const status = json.autorizado ? "ACESSO PERMITIDO" : "ACESSO NEGADO";
                const nome = json.participante ? json.participante.nome : "Desconhecido";
                console.log(`[${new Date().toLocaleTimeString()}] Envio: ${status} - ${nome}`);
            } catch (e) {
                console.log("Resposta bruta:", responseData);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Erro na requisição: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

function simulate() {
    // 80% de chance de sucesso, 20% de falha (não reconhecido)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
        // IDs assumidos entre 1 e 100 (ajustável). 
        // Como acabamos de inserir 100, deve ter IDs até 100+.
        const randomId = Math.floor(Math.random() * 100) + 1;

        sendScan({
            device_id: 'sim_auto_01',
            template: `bio_sim_${randomId}`,
            force_match_id: randomId // Força o backend a achar esse ID
        });
    } else {
        // Falha: envia template desconhecido e sem ID forçado
        sendScan({
            device_id: 'sim_auto_01',
            template: `bio_unknown_${Date.now()}`,
            force_match_id: null
        });
    }
}

// Loop
setInterval(simulate, INTERVAL_MS);
simulate(); // Primeira execução imediata
