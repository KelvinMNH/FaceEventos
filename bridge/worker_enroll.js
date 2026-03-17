const koffi = require('koffi');
const path = require('path');
const fs = require('fs');

const log = (m) => process.stderr.write(`[Worker] ${m}\n`);

const dllApi = path.join(__dirname, 'FTRAPI.dll');
const framePath = path.join(__dirname, 'current_enroll_frame.raw');

async function run() {
    try {
        if (!fs.existsSync(framePath)) throw new Error('Frame não encontrado');
        const frameBuffer = fs.readFileSync(framePath);

        const libApi = koffi.load(dllApi);

        const FTRHANDLE = 'uintptr_t';
        const FTR_DATA = koffi.struct('FTR_DATA', { dwSize: 'uint32', pData: koffi.pointer('uint8_t') });
        const PFTR_DATA = koffi.pointer(FTR_DATA);
        const FTR_BITMAP = koffi.struct('FTR_BITMAP', { dwWidth: 'uint32', dwHeight: 'uint32', pData: koffi.pointer('uint8_t') });
        const PFTR_BITMAP = koffi.pointer(FTR_BITMAP);

        const FTRInitialize = libApi.func('__stdcall', 'FTRInitialize', 'uint32', []);
        const FTRTerminate = libApi.func('__stdcall', 'FTRTerminate', 'uint32', []);
        const FTRSetParam = libApi.func('__stdcall', 'FTRSetParam', 'uint32', ['uint32', 'uintptr_t']);
        const FTREnroll = libApi.func('__stdcall', 'FTREnroll', 'uint32', [FTRHANDLE, 'uint32', PFTR_DATA]);

        const enrollStatusCallback = koffi.register((context, state) => {
            const states = { 3: 'READY', 5: 'REMOVE', 6: 'PUT' };
            log(`STATUS: ${states[state] || state}`);
        }, koffi.pointer(koffi.proto('__stdcall', 'FTR_CB_ENROLL_STATUS', 'void', ['uintptr_t', 'uint32'])));

        const controlCallback = koffi.register((context, code, data) => 0, 
            koffi.pointer(koffi.proto('__stdcall', 'FTR_CB_CONTROL', 'uint32', ['uintptr_t', 'uint32', 'uintptr_t'])));

        const getFrameCallback = koffi.register((context, pBitmap) => {
            const bitmap = pBitmap[0];
            bitmap.dwWidth = 320; bitmap.dwHeight = 480;
            koffi.decode(bitmap.pData, 'uint8_t', 153600).set(frameBuffer);
            return 0; 
        }, koffi.pointer(koffi.proto('__stdcall', 'FTR_CB_GET_FRAME', 'uint32', ['uintptr_t', PFTR_BITMAP])));

        if (FTRInitialize() !== 0) throw new Error('Falha Initialize');

        FTRSetParam(4, koffi.address(controlCallback)); 
        FTRSetParam(1, koffi.address(getFrameCallback));
        FTRSetParam(2, koffi.address(enrollStatusCallback)); 
        FTRSetParam(3, 1); 
        FTRSetParam(8, 5000); 

        const templateData = { dwSize: 16384, pData: koffi.alloc('uint8_t', 16384) };
        const result = FTREnroll(0xCAFE, 1, templateData);

        if (result === 0) {
            const out = Buffer.from(templateData.pData.buffer, templateData.pData.byteOffset, templateData.dwSize);
            process.stdout.write(out.toString('base64'));
        } else {
            log(`ERRO: 0x${result.toString(16).toUpperCase()}`);
            process.exit(1);
        }

        FTRTerminate();
        try { fs.unlinkSync(framePath); } catch(e) {}
        process.exit(0);
    } catch (e) {
        log(`FALHA: ${e.message}`);
        process.exit(1);
    }
}
run();
