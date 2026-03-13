const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function probe() {
    try {
        console.log("🔑 Login...");
        const login = await post('http://localhost:3000/api/login', { username: 'admin', password: 'admin123' });
        if (login.status !== 200) {
            console.log("❌ Login failed:", login.data);
            return;
        }
        const token = login.data.token;
        console.log("✅ Logado.");

        console.log("📋 Listando eventos...");
        const list = await get('http://localhost:3000/api/eventos', token);
        if (list.data.length > 0) {
            console.log(`Found ${list.data.length} events.`);
            const ev = list.data[0];
            console.log(`First Event: ID=${ev.id}, Nome="${ev.nome}", UUID="${ev.uuid}"`);
            
            if (!ev.uuid) {
                console.log("❌ ERROR: UUID IS MISSING IN API RESPONSE!");
                return;
            }

            console.log(`🔍 Probing individual event by UUID: ${ev.uuid}`);
            const single = await get(`http://localhost:3000/api/eventos/${ev.uuid}`, token);
            console.log(`Backend Status: ${single.status}`);
            console.log(`Backend Response:`, JSON.stringify(single.data, null, 2));
        } else {
            console.log("⚠️ No events found.");
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

probe();
