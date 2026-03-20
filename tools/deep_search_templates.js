const koffi = require('koffi');
const path = require('path');

const dlls = ['FTRAPI.dll', 'ftrScanAPI.dll'];
const keywords = ['Template', 'Extract', 'Enroll', 'Match', 'Identify', 'Get', 'Create'];

dlls.forEach(dll => {
    const fullPath = path.join(__dirname, 'bridge', dll);
    try {
        const lib = koffi.load(fullPath);
        console.log(`--- Functions in ${dll} ---`);
        // Teste cego: tentamos nomes comuns e variações
        const candidates = [
            'FTRExtract', 'FTRExtractEx', 'FTRGetTemplate', 'FTRCreateTemplate',
            'ftrExtract', 'ftrGetTemplate', 'ftrCreateTemplate',
            'FTREnroll', 'FTREnrollEx', 'FTREnrollX',
            'MatchTemplates', 'matchTemplates', 'FTRMatch', 'ftrMatch',
            'ftrScanGetImage', 'ftrScanGetImage2', 'ftrScanGetImageSize'
        ];
        
        candidates.forEach(fn => {
            try {
                lib.func('__stdcall', fn, 'uint32', ['uintptr_t', 'uintptr_t', 'uintptr_t', 'uintptr_t']);
                console.log(`[FOUND] ${fn}`);
            } catch(e) {}
        });
    } catch (e) {
        console.error(`Falha ao carregar ${dll}: ${e.message}`);
    }
});
