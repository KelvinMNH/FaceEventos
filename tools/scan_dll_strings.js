const fs = require('fs');
const path = require('path');

const dlls = ['FTRAPI.dll', 'ftrScanAPI.dll'];
const keywords = ['Template', 'Enroll', 'Extract', 'Identify', 'Match'];

dlls.forEach(dll => {
    const fullPath = path.join(__dirname, 'bridge', dll);
    try {
        const buffer = fs.readFileSync(fullPath);
        const content = buffer.toString('ascii');
        console.log(`--- Keywords in ${dll} ---`);
        keywords.forEach(kw => {
            let found = false;
            let pos = -1;
            while ((pos = content.indexOf(kw, pos + 1)) !== -1) {
                // Pega 20 caracteres ao redor
                const snippet = content.substring(Math.max(0, pos - 10), Math.min(content.length, pos + 30));
                console.log(`[FOUND] ${kw}: ...${snippet.replace(/[^a-zA-Z0-9_]/g, '.') }...`);
                found = true;
            }
            if (!found) console.log(`[NOT FOUND] ${kw}`);
        });
    } catch (e) {
        console.error(`Erro ao ler ${dll}: ${e.message}`);
    }
});
