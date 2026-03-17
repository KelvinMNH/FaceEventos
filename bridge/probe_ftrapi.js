const koffi = require('koffi');
const path = require('path');

const dllApi = path.join(__dirname, 'FTRAPI.dll');

try {
    const libApi = koffi.load(dllApi);
    const names = [
        'FTRInitialize', 'FTRTerminate', 
        'ftrEnroll', 'FTREnroll',
        'ftrVerify', 'FTRVerify',
        'ftrIdentify', 'FTRIdentify',
        'ftrExtractTemplate', 'FTRExtractTemplate',
        'ftrGetTemplate', 'FTRGetTemplate',
        'ftrSetParam', 'FTRSetParam',
        'ftrGetParam', 'FTRGetParam',
        'ftrCaptureFrame', 'FTRCaptureFrame',
        'ftrGetImageSize', 'FTRGetImageSize'
    ];

    console.log('Procurando funções em FTRAPI.dll...');
    for (const name of names) {
        try {
            // Tentamos mapear como uma função genérica apenas para ver se existe o símbolo
            libApi.func('__stdcall', name, 'int', []);
            console.log(`[EXISTE] ${name}`);
        } catch (e) {
            // console.log(`[NAO] ${name}`);
        }
    }
} catch (e) {
    console.error('Erro:', e.message);
}
