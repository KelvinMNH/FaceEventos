const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function runTest() {
    const logFile = fs.openSync('C:\\Users\\kelvin.higino\\Documents\\UniEventos\\full_debug.log', 'w');
    
    console.log("🚀 Iniciando Servidor...");
    const server = spawn('node', ['server.js'], { 
        cwd: 'C:\\Users\\kelvin.higino\\Documents\\UniEventos\\backend',
        env: { ...process.env, PORT: '3000' },
        stdio: ['ignore', logFile, logFile]
    });

    // Aguarda o servidor subir
    await new Promise(r => setTimeout(r, 5000));

    const uuid = 'afc8eaf1-e717-415a-9049-3c381d3376c9';
    console.log(`📡 Fazendo requisição para UUID: ${uuid}`);

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/public-debug/${uuid}`,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`DATA: ${data}`);
            
            console.log("🛑 Encerrando servidor...");
            server.kill();
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error(`ERRO: ${e.message}`);
        server.kill();
        process.exit(1);
    });

    req.end();
}

runTest();
