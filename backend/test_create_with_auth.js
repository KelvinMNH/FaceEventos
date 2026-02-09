// Node 18+ has global fetch
async function testWithAuth() {
    try {
        console.log("Logging in as admin...");
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) {
            console.error("Login failed:", loginData);
            return;
        }

        const token = loginData.token;
        console.log("Login successful! Token acquired.");

        const eventData = {
            nome: "Evento Teste " + new Date().toISOString(),
            data: "2026-05-20",
            hora: "10:00",
            local: "Auditório Principal",
            permitir_acompanhantes: true,
            max_acompanhantes: 1
        };

        console.log("Creating event...");
        const res = await fetch('http://localhost:3000/api/eventos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData)
        });

        const data = await res.json();
        console.log("Create Response:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Test error:", e);
    }
}

testWithAuth();
