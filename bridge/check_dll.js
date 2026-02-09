const koffi = require('koffi');
const path = require('path');

console.log('Iniciando Check DLL...');
const dllPath = path.join(__dirname, 'ftrScanAPI.dll');

try {
    const lib = koffi.load(dllPath);
    console.log('DLL Carregada.');

    const FTRHANDLE = koffi.pointer('FTRHANDLE', koffi.opaque());
    // Tentar __cdecl
    const ftrScanOpenDevice = lib.func('__cdecl', 'ftrScanOpenDevice', FTRHANDLE, []);

    console.log('Função OpenDevice mapeada.');

    console.log('Chamando OpenDevice...');
    const hDevice = ftrScanOpenDevice();
    console.log('OpenDevice retornou:', hDevice);

    if (hDevice) {
        console.log('SUCESSO: Device aberto!');
        const ftrScanCloseDevice = lib.func('__stdcall', 'ftrScanCloseDevice', 'void', [FTRHANDLE]);
        ftrScanCloseDevice(hDevice);
        console.log('Device fechado.');
    } else {
        console.log('FALHA: Device retornou null (não conectado ou erro).');
    }

} catch (e) {
    console.error('ERRO FATAL:', e);
}
console.log('Fim Check DLL.');
