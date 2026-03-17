const koffi = require('koffi');
const path = require('path');

const dllScan = path.join(__dirname, 'ftrScanAPI.dll');
const dllApi = path.join(__dirname, 'FTRAPI.dll');

try {
    const libScan = koffi.load(dllScan);
    console.log('ftrScanAPI.dll carregada.');

    const libApi = koffi.load(dllApi);
    console.log('FTRAPI.dll carregada.');

    const FTRInitialize = libApi.func('__stdcall', 'FTRInitialize', 'int', []);
    const FTRTerminate = libApi.func('__stdcall', 'FTRTerminate', 'int', []);

    const resInit = FTRInitialize();
    console.log('FTRInitialize result:', resInit);

    if (resInit === 0) { // FTR_RET_OK
        console.log('API Biométrica Inicializada!');
        FTRTerminate();
        console.log('API Finalizada.');
    } else {
        console.log('Falha ao inicializar API:', resInit);
    }
} catch (e) {
    console.error('Erro no teste:', e.message);
}
