// Node 18+ has global fetch
async function testWithEmptyImage() {
    try {
        console.log("Logging in as admin...");
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        const token = loginData.token;

        const eventData = {
            nome: "Evento Teste Img Vazia " + new Date().toISOString(),
            data: "2026-06-25",
            hora: "11:00",
            local: "Sala 2",
            imagem: "" // Empty string like the frontend default
        };

        console.log("Creating event with empty image string...");
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

testWithEmptyImage();
