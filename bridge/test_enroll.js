const koffi = require('koffi');
const path = require('path');

const dllScan = path.join(__dirname, 'ftrScanAPI.dll');
const dllApi = path.join(__dirname, 'FTRAPI.dll');

try {
    const libScan = koffi.load(dllScan);
    const libApi = koffi.load(dllApi);

    // Types
    const FTRHANDLE = koffi.pointer('FTRHANDLE', koffi.opaque());
    const FTR_DATA = koffi.struct('FTR_DATA', {
        dwSize: 'uint32', // Use uint32 for DWORD
        pData: koffi.pointer('uint8_t')
    });
    const PFTR_DATA = koffi.pointer(FTR_DATA);

    // Enums
    const FTR_PARAM_CB_FRAME_SOURCE = 1;
    const FTR_PURPOSE_ENROLL = 2;

    // Functions
    const FTRInitialize = libApi.func('__stdcall', 'FTRInitialize', 'uint32', []);
    const FTRTerminate = libApi.func('__stdcall', 'FTRTerminate', 'uint32', []);
    const FTRSetParam = libApi.func('__stdcall', 'FTRSetParam', 'uint32', ['uint32', 'uintptr_t']);
    const FTREnroll = libApi.func('__stdcall', 'FTREnroll', 'uint32', ['uintptr_t', 'uint32', PFTR_DATA]);

    // Callback Type for Frame Source
    // FTR_STATUS (CALLBACK *FTR_CB_GET_FRAME)(FTR_USER_CTX Context, FTR_BITMAP_PTR pBitmap);
    // Bitmap is usually a struct with size info + data
    const FTR_BITMAP = koffi.struct('FTR_BITMAP', {
        dwWidth: 'uint32',
        dwHeight: 'uint32',
        pData: koffi.pointer('uint8_t')
    });
    const PFTR_BITMAP = koffi.pointer(FTR_BITMAP);
    const FTR_CB_GET_FRAME = koffi.proto('__stdcall', 'FTR_CB_GET_FRAME', 'uint32', ['uintptr_t', PFTR_BITMAP]);

    console.log('Inicializando API...');
    if (FTRInitialize() !== 0) throw new Error('Falha Initialize');

    // Aqui precisaríamos de uma imagem real para testar a extração
    // Por enquanto, vamos apenas validar se conseguimos configurar o parâmetro
    console.log('Configurando Param...');
    
    // Teste de encerramento seguro
    FTRTerminate();
    console.log('Teste de carregamento de símbolos OK.');

} catch (e) {
    console.error('Erro:', e.message);
}
