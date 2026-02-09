// Node 18+
async function testDuplicateEntry() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        console.log("Searching for a participant (query='a')...");
        const searchRes = await fetch('http://localhost:3000/api/participantes/busca?q=a', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const searchData = await searchRes.json();
        console.log("Search Response Structure:", JSON.stringify(searchData, null, 2));

        // Handle array or object response
        let participantId;
        if (Array.isArray(searchData) && searchData.length > 0) {
            participantId = searchData[0].id;
        } else if (searchData.participantes && Array.isArray(searchData.participantes) && searchData.participantes.length > 0) {
            participantId = searchData.participantes[0].id;
        }

        if (!participantId) {
            console.log("No participant found, cannot test duplicate entry.");
            return;
        }

        console.log("Using Participant ID:", participantId);

        // 2. Perform First Entry
        console.log("Performing First Entry...");
        const entry1 = await fetch('http://localhost:3000/api/manual-entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ participanteId: participantId })
        });
        const res1 = await entry1.json();
        // If already in, that's fine for testing the second block
        console.log("Entry 1 Result:", res1.success || res1.autorizado ? "SUCCESS" : "FAILED/ALREADY IN", res1.msg || res1.mensagem);

        // 3. Perform Second Entry (Should Fail)
        console.log("Performing Second Entry (Duplicate)...");
        const entry2 = await fetch('http://localhost:3000/api/manual-entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ participanteId: participantId })
        });
        const res2 = await entry2.json();

        if (!res2.success && (res2.msg.includes('já validado') || res2.already_in)) {
            console.log("Entry 2 Result: BLOCKED (Expected)", res2.msg);
        } else {
            console.log("Entry 2 Result: FAILED (Unexpected)", JSON.stringify(res2));
        }

    } catch (e) {
        console.error("Test Error:", e);
    }
}

testDuplicateEntry();
