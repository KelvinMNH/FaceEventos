

async function testApi() {
    try {
        console.log("Testing API HTTP Request to: http://localhost:3000/api/logs?evento_id=1");

        // Tenta fetch nativo (Node 18+)
        const res = await fetch('http://localhost:3000/api/logs?evento_id=1');

        if (!res.ok) {
            console.error(`HTTP Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Body:", text);
            return;
        }

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log(`Count: ${Array.isArray(data) ? data.length : 'Not an array'}`);

        if (Array.isArray(data) && data.length > 0) {
            console.log("First Item:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("Empty Response Data:", data);
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testApi();
