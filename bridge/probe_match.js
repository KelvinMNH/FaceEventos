const koffi = require('koffi');
const path = require('path');

const dllApi = path.join(__dirname, 'FTRAPI.dll');

try {
    const libApi = koffi.load(dllApi);
    const names = [
        'ftrMatch', 'FTRMatch',
        'ftrMatchTemplates', 'FTRMatchTemplates',
        'ftrCompare', 'FTRCompare',
        'ftrCompareTemplates', 'FTRCompareTemplates',
        'ftrVerifyTemplate', 'FTRVerifyTemplate'
    ];

    console.log('Procurando funções de comparação em FTRAPI.dll...');
    for (const name of names) {
        try {
            libApi.func('__stdcall', name, 'int', []);
            console.log(`[EXISTE] ${name}`);
        } catch (e) {}
    }
} catch (e) {
    console.error('Erro:', e.message);
}
