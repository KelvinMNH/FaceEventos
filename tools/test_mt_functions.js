const koffi = require('koffi');
const path = require('path');

const dllApi = path.join(__dirname, 'bridge', 'FTRAPI.dll');
const functions = [
    'MTIdentify', 'MTIdentifyN', 'MTVerify', 'MTVerifyN', 
    'MTInitialize', 'MTTerminate', 'MTSetBaseTemplate', 'MTGetBaseTemplate',
    'FTRExtract', 'FTREnroll'
];

try {
    const lib = koffi.load(dllApi);
    console.log('--- FTRAPI.dll MT Functions ---');
    functions.forEach(fn => {
        try {
            // Tentativa de mapeamento generica
            lib.func('__stdcall', fn, 'uint32', ['uintptr_t', 'uintptr_t', 'uintptr_t', 'uintptr_t']);
            console.log(`[OK] ${fn}`);
        } catch (e) {
            console.log(`[MISSING] ${fn}`);
        }
    });
} catch (e) {
    console.error('Falha ao carregar DLL:', e.message);
}
