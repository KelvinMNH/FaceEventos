
// Se der erro de node-fetch, removo na execucao

async function testCreate() {
    try {
        console.log("Testing Create Event...");
        const res = await fetch('http://localhost:3000/api/eventos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: "Evento Teste Auto",
                data: "2026-12-31",
                hora: "20:00",
                local: "Local Teste",
                permitir_acompanhantes: true
            })
        });

        const data = await res.json();
        console.log("Create Response:", JSON.stringify(data, null, 2));

        console.log("Testing List Events...");
        const resList = await fetch('http://localhost:3000/api/eventos');
        const list = await resList.json();
        console.log("List Count:", list.length);
        if (list.length > 0) console.log("First Event:", list[0].nome);

    } catch (e) { console.error(e); }
}

testCreate();
