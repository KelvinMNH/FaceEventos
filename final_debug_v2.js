const { spawn } = require('child_process');
const http = require('http');

function request(options, data) {
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    process.env.JWT_SECRET = 'unieventos_secret_key_123';
    console.log("🚀 Iniciando Servidor Backend...");
    const server = spawn('node', ['server.js'], { cwd: './backend' });
    
    server.stdout.on('data', (d) => {
        const line = d.toString();
        if (line.includes('🔍') || line.includes('❌') || line.includes('🚀')) {
            console.log('SRV:', line.trim());
        }
    });

    await new Promise(r => setTimeout(r, 4000));

    console.log("🔑 Realizando Login...");
    const login = await request({
        hostname: 'localhost', port: 3000, path: '/api/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });

    if (login.status !== 200) {
        console.log("❌ FALHA NO LOGIN", login);
        server.kill(); return;
    }
    const token = login.data.token;

    console.log("📋 Listando Eventos...");
    const list = await request({
        hostname: 'localhost', port: 3000, path: '/api/eventos', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (list.status === 200 && list.data.length > 0) {
        const uuid = list.data[0].uuid;
        console.log(`🔍 Testando busca individual por UUID: ${uuid}`);
        const single = await request({
            hostname: 'localhost', port: 3000, path: `/api/eventos/${uuid}`, method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`RESULTADO STATUS: ${single.status}`);
        console.log(`RESULTADO DATA:`, JSON.stringify(single.data));
    } else {
        console.log("⚠️ Falha na listagem ou nenhum evento encontrado", list);
    }

    console.log("🛑 Encerrando Servidor...");
    server.kill();
    setTimeout(() => process.exit(), 1000);
}

test();
