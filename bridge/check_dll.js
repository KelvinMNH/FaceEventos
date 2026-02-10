const koffi = require('koffi');
const path = require('path');

console.log('Iniciando Teste de Presença...');
const dllPath = path.join(__dirname, 'ftrScanAPI.dll');

try {
    const lib = koffi.load(dllPath);
    const FTRHANDLE = koffi.pointer('FTRHANDLE', koffi.opaque());

    // Config Structs
    const FTRSCAN_FRAME_PARAMETERS = koffi.struct('FTRSCAN_FRAME_PARAMETERS', {
        nContrastOnDose2: 'int',
        nContrastOnDose4: 'int',
        nDose: 'int',
        nBrightnessOnDose2: 'int',
        nBrightnessOnDose4: 'int',
        nFakeReplicaInterval: 'int',
        reserved1: 'int',
        reserved2: 'int'
    });
    const PFTRSCAN_FRAME_PARAMETERS = koffi.pointer(FTRSCAN_FRAME_PARAMETERS);

    const ftrScanOpenDevice = lib.func('__cdecl', 'ftrScanOpenDevice', FTRHANDLE, []);
    const ftrScanCloseDevice = lib.func('__stdcall', 'ftrScanCloseDevice', 'void', [FTRHANDLE]); // Check consistency
    const ftrScanIsFingerPresent = lib.func('__cdecl', 'ftrScanIsFingerPresent', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_FRAME_PARAMETERS)]);

    const hDevice = ftrScanOpenDevice();
    if (hDevice) {
        console.log('Device aberto. Testando por 5 segundos...');

        let count = 0;
        const interval = setInterval(() => {
            const params = {};
            const isPresent = ftrScanIsFingerPresent(hDevice, params);
            console.log(`[${count}] Present: ${isPresent} | Contrast2: ${params.nContrastOnDose2} | Contrast4: ${params.nContrastOnDose4}`);

            count++;
            if (count >= 10) { // 5 segundos (10 * 500ms)
                clearInterval(interval);
                ftrScanCloseDevice(hDevice);
                console.log('Teste finalizado.');
            }
        }, 500);

    } else {
        console.log('FALHA: Device não abriu.');
    }

} catch (e) {
    console.error('ERRO:', e);
}
