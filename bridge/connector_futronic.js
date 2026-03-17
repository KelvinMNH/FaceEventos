const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const koffi = require('koffi');

// --- Logger ---
const LOG_FILE = path.join(__dirname, 'bridge_debug.log');
function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, formatted, { encoding: 'utf8' });
    } catch (e) {}
}
logDebug('[Bridge] Bridge Iniciada.');

// --- Constantes Futronic ---
const FTR_PARAM_CB_FRAME_SOURCE = 1;
const FTR_PARAM_CB_ENROLL_STATUS = 2;
const FTR_PARAM_MATCHING_THRESHOLD = 3;
const FTR_PARAM_CB_CONTROL = 4;

const FTR_PURPOSE_IDENTIFY = 0;
const FTR_PURPOSE_ENROLL = 1;

const FTR_STATE_EMPTY_FRAME = 0;
const FTR_STATE_LOW_CONTRAST = 1;
const FTR_STATE_NOT_ENOUGH_MINUTIAE = 2;
const FTR_STATE_READY_TO_PROCESS = 3;
const FTR_STATE_REPROCESS = 4;
const FTR_STATE_REMOVE_FINGER = 5;
const FTR_STATE_PUT_FINGER = 6;

const FTR_STATE_TEXT = {
    [FTR_STATE_EMPTY_FRAME]: "Aguardando dedo...",
    [FTR_STATE_LOW_CONTRAST]: "Qualidade baixa, pressione com firmeza.",
    [FTR_STATE_NOT_ENOUGH_MINUTIAE]: "Digital insuficiente, tente outro ângulo.",
    [FTR_STATE_READY_TO_PROCESS]: "Processando...",
    [FTR_STATE_REPROCESS]: "Falha no processamento, tente novamente.",
    [FTR_STATE_REMOVE_FINGER]: "Remova o dedo do leitor.",
    [FTR_STATE_PUT_FINGER]: "Coloque o dedo no leitor."
};

// --- WebSocket ---
const WS_PORT = 4000;
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('listening', () => logDebug(`[Bridge] WebSocket OUVINDO na porta ${WS_PORT}`));
wss.on('error', (err) => console.error(`[Bridge] Erro WebSocket:`, err));

process.on('uncaughtException', (err) => console.error(`[Bridge] Exceção:`, err));

// --- DLLs ---
const dllScan = path.join(__dirname, 'ftrScanAPI.dll');
const dllApi = path.join(__dirname, 'FTRAPI.dll');

let libScan, libApi;
try {
    libScan = koffi.load(dllScan);
    libApi = koffi.load(dllApi);
} catch (e) {
    console.error(`[Bridge] Erro DLLs: ${e.message}`);
    process.exit(1);
}

const FTRHANDLE = 'uintptr_t';
const PFTRHANDLE = koffi.pointer('uintptr_t');
const FTRSCAN_IMAGE_SIZE = koffi.struct('FTRSCAN_IMAGE_SIZE', { nWidth: 'int', nHeight: 'int', nImageSize: 'int' });
const PFTRSCAN_IMAGE_SIZE = koffi.pointer(FTRSCAN_IMAGE_SIZE);
const FTRSCAN_FRAME_PARAMETERS = koffi.struct('FTRSCAN_FRAME_PARAMETERS', { 
    nContrastOnDose2: 'int', nContrastOnDose4: 'int', nDose: 'int', 
    nBrightnessOnDose2: 'int', nBrightnessOnDose4: 'int', nFakeReplicaInterval: 'int',
    reserved1: 'int', reserved2: 'int' 
});
const PFTRSCAN_FRAME_PARAMETERS = koffi.pointer(FTRSCAN_FRAME_PARAMETERS);
const PBYTE = koffi.pointer('uint8_t');
const FTR_DATA = koffi.struct('FTR_DATA', { dwSize: 'uint32', pData: koffi.pointer('uint8_t') });
const PFTR_DATA = koffi.pointer(FTR_DATA);
const FTR_BITMAP = koffi.struct('FTR_BITMAP', { dwWidth: 'uint32', dwHeight: 'uint32', pData: koffi.pointer('uint8_t') });
const PFTR_BITMAP = koffi.pointer(FTR_BITMAP);
const FTR_IDENTIFY_RECORD = koffi.struct('FTR_IDENTIFY_RECORD', { KeyValue: 'uint32', pData: PFTR_DATA });
const PFTR_IDENTIFY_RECORD = koffi.pointer(FTR_IDENTIFY_RECORD);
const FTR_IDENTIFY_ARRAY = koffi.struct('FTR_IDENTIFY_ARRAY', { TotalNumber: 'uint32', pRecords: koffi.pointer(FTR_IDENTIFY_RECORD) });
const PFTR_IDENTIFY_ARRAY = koffi.pointer(FTR_IDENTIFY_ARRAY);
const PUINT32 = koffi.pointer('uint32');
const PINT = koffi.pointer('int');

const PFTR_CB_GET_FRAME = koffi.pointer(koffi.proto('__stdcall', 'FTR_CB_GET_FRAME', 'uint32', ['uintptr_t', PFTR_BITMAP]));
const PFTR_CB_ENROLL_STATUS = koffi.pointer(koffi.proto('__stdcall', 'FTR_CB_ENROLL_STATUS', 'void', ['uintptr_t', 'uint32']));

let ftrScanOpenDevice, ftrScanCloseDevice, ftrScanGetImageSize, ftrScanIsFingerPresent, ftrScanGetImage;
let FTRInitialize, FTRTerminate, FTRSetParam, FTREnroll, FTRIdentify, FTRVerify, FTRVerifyTemplate;

try {
    ftrScanOpenDevice = libScan.func('__cdecl', 'ftrScanOpenDevice', FTRHANDLE, []);
    ftrScanCloseDevice = libScan.func('__cdecl', 'ftrScanCloseDevice', 'void', [FTRHANDLE]);
    ftrScanGetImageSize = libScan.func('__cdecl', 'ftrScanGetImageSize', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_IMAGE_SIZE)]);
    ftrScanIsFingerPresent = libScan.func('__cdecl', 'ftrScanIsFingerPresent', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_FRAME_PARAMETERS)]);
    ftrScanGetImage = libScan.func('__cdecl', 'ftrScanGetImage', 'int', [FTRHANDLE, 'int', koffi.out(PBYTE)]);

    FTRInitialize = libApi.func('__stdcall', 'FTRInitialize', 'uint32', []);
    FTRTerminate = libApi.func('__stdcall', 'FTRTerminate', 'uint32', []);
    FTRSetParam = libApi.func('__stdcall', 'FTRSetParam', 'uint32', ['uint32', 'uintptr_t']);
    FTREnroll = libApi.func('__stdcall', 'FTREnroll', 'uint32', [FTRHANDLE, 'uint32', PFTR_DATA]);
    FTRIdentify = libApi.func('__stdcall', 'FTRIdentify', 'uint32', [FTRHANDLE, PFTR_IDENTIFY_ARRAY, PUINT32]);
    FTRVerify = libApi.func('__stdcall', 'FTRVerify', 'uint32', [FTRHANDLE, PFTR_DATA, PINT]);
    try { FTRVerifyTemplate = libApi.func('__stdcall', 'FTRVerifyTemplate', 'uint32', ['uintptr_t', PFTR_DATA, PFTR_DATA, PINT]); } catch(e) { FTRVerifyTemplate = null; }

    if (FTRInitialize() === 0) FTRSetParam(FTR_PARAM_MATCHING_THRESHOLD, 6);
} catch (e) {
    console.error('[Bridge] Erro mapeamento:', e);
}

// --- Estado ---
let hDevice = null;
let imageSize = { nWidth: 320, nHeight: 480, nImageSize: 161904 };
let isCapturing = false;
let isSDKOperating = false;
let enrollTriggerPending = false;

function openDevice() {
    if (hDevice) return true;
    try {
        hDevice = ftrScanOpenDevice();
        if (hDevice) {
            const sizeStruct = {};
            if (ftrScanGetImageSize(hDevice, sizeStruct)) imageSize = sizeStruct;
            broadcast({ type: 'DEVICE_STATUS', status: 'connected', message: 'Leitor Conectado' });
            return true;
        }
        broadcast({ type: 'DEVICE_STATUS', status: 'disconnected', message: 'Leitor Desconectado' });
        return false;
    } catch (e) {
        return false;
    }
}

function closeDevice() {
    if (hDevice) {
        try { ftrScanCloseDevice(hDevice); } catch (e) {}
        hDevice = null;
    }
}

async function identifyFinger(templatesBase64) {
    if (isSDKOperating) return -1;
    isSDKOperating = true;
    let allocatedBuffers = [];
    try {
        await stopCapture();
        closeDevice();
        if (typeof FTRTerminate === 'function') FTRTerminate();
        await new Promise(r => setTimeout(r, 2000));
        FTRInitialize();
        FTRSetParam(FTR_PARAM_CB_CONTROL, 0); 
        FTRSetParam(FTR_PARAM_CB_FRAME_SOURCE, 0); 

        const count = templatesBase64.length;
        const records = koffi.alloc(FTR_IDENTIFY_RECORD, count);
        for (let i = 0; i < count; i++) {
            const templateBuffer = Buffer.from(templatesBase64[i], 'base64');
            const dataPtr = koffi.alloc('uint8_t', templateBuffer.length);
            new Uint8Array(dataPtr.buffer, dataPtr.byteOffset, templateBuffer.length).set(templateBuffer);
            allocatedBuffers.push(dataPtr);
            records[i].KeyValue = i;
            records[i].pData = { dwSize: templateBuffer.length, pData: dataPtr };
        }
        
        const identifyArray = { TotalNumber: count, pRecords: records };
        let pIndexArr = [0];
        const result = FTRIdentify(0, identifyArray, pIndexArr);
        
        if (result === 0) return pIndexArr[0];
        if (result === 0x20000002) broadcast({ type: 'STATUS', status: 'not_found', message: 'Digital não reconhecida' });
        return -1;
    } catch (e) {
        return -1;
    } finally {
        isSDKOperating = false;
        startCapture(); 
    }
}

async function matchTemplates(base64A, base64B) {
    try {
        const bufA = Buffer.from(base64A, 'base64');
        const bufB = Buffer.from(base64B, 'base64');
        const pDataA = koffi.alloc('uint8_t', bufA.length);
        const pDataB = koffi.alloc('uint8_t', bufB.length);
        new Uint8Array(pDataA.buffer, pDataA.byteOffset, bufA.length).set(bufA);
        new Uint8Array(pDataB.buffer, pDataB.byteOffset, bufB.length).set(bufB);
        let pResult = [0];
        const result = FTRVerifyTemplate(0, { dwSize: bufA.length, pData: pDataA }, { dwSize: bufB.length, pData: pDataB }, pResult);
        return result === 0 && pResult[0] !== 0;
    } catch (e) { return false; }
}

async function verifyFinger(templateBase64) {
    if (!templateBase64 || isSDKOperating) return false;
    isSDKOperating = true;
    try {
        await stopCapture();
        closeDevice();
        if (typeof FTRTerminate === 'function') FTRTerminate();
        await new Promise(r => setTimeout(r, 2000));
        FTRInitialize();
        const templateBuffer = Buffer.from(templateBase64, 'base64');
        const pTemplate = koffi.alloc('uint8_t', templateBuffer.length);
        new Uint8Array(pTemplate.buffer, pTemplate.byteOffset, templateBuffer.length).set(templateBuffer);
        FTRSetParam(FTR_PARAM_CB_CONTROL, 0); 
        FTRSetParam(FTR_PARAM_CB_FRAME_SOURCE, 0); 
        let pResult = [0];
        const result = FTRVerify(0, { dwSize: templateBuffer.length, pData: pTemplate }, pResult);
        return result === 0 && pResult[0] !== 0;
    } catch (e) { return false; } finally {
        isSDKOperating = false;
        startCapture();
    }
}

async function enrollFinger() {
    if (isSDKOperating) return null;
    enrollTriggerPending = true;
    broadcast({ type: 'ENROLL_STATUS', status: 6, message: 'Coloque o dedo no leitor' });
    if (!isCapturing) await startCapture();
    return 'pending';
}

async function executeEnrollWorker() {
    if (isSDKOperating) return;
    isSDKOperating = true;
    try {
        logDebug('[Bridge] Processando digital...');
        const rawBuffer = Buffer.alloc(153600);
        if (ftrScanGetImage(hDevice, 4, rawBuffer)) {
            let min = 255, max = 0;
            for(let i=0; i<153600; i++) {
                if(rawBuffer[i] < min) min = rawBuffer[i];
                if(rawBuffer[i] > max) max = rawBuffer[i];
            }
            const range = max - min;
            const processed = Buffer.alloc(153600);
            if (range < 10) {
                 for(let i=0; i<153600; i++) processed[i] = 255 - rawBuffer[i];
            } else {
                 for(let i=0; i<153600; i++) processed[i] = 255 - (((rawBuffer[i] - min) * 255) / range);
            }
            fs.writeFileSync(path.join(__dirname, 'current_enroll_frame.raw'), processed);
        } else throw new Error('Falha na captura');

        await stopCapture();
        closeDevice();
        if (typeof FTRTerminate === 'function') FTRTerminate();
        await new Promise(r => setTimeout(r, 3000));

        const worker = spawn('node', [path.join(__dirname, 'worker_enroll.js')]);
        let templateBase64 = '';
        worker.stdout.on('data', (data) => { templateBase64 += data.toString(); });
        worker.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('READY')) broadcast({ type: 'ENROLL_STATUS', status: 3, message: 'Processando...' });
            else if (msg.includes('REMOVE')) broadcast({ type: 'ENROLL_STATUS', status: 5, message: 'Remova o dedo' });
            else if (msg.includes('PUT')) broadcast({ type: 'ENROLL_STATUS', status: 6, message: 'Coloque o dedo novamente' });
        });

        const resultWorker = await new Promise((resolve) => {
            worker.on('close', (code) => {
                if (code === 0 && templateBase64.length > 100) resolve(templateBase64.trim());
                else resolve(null);
            });
        });

        if (resultWorker) broadcast({ type: 'ENROLL_RESULT', success: true, template: resultWorker });
        else broadcast({ type: 'ENROLL_RESULT', success: false, message: 'Falha no cadastro.' });
    } catch (e) {
        broadcast({ type: 'ENROLL_RESULT', success: false, message: e.message });
    } finally {
        isSDKOperating = false;
        enrollTriggerPending = false;
        if (typeof FTRInitialize === 'function') FTRInitialize();
        if (!hDevice) openDevice();
        setTimeout(() => startCapture(), 500);
    }
}

// --- Loop de Captura ---
let capturePromise = null;
let loopExitResolve = null;

async function startCapture() {
    if (isCapturing || isSDKOperating) return;
    if (!hDevice && !openDevice()) return;
    isCapturing = true;
    capturePromise = (async () => {
        try {
            while (isCapturing) {
                if (isSDKOperating) { await new Promise(r => setTimeout(r, 200)); continue; }
                if (hDevice) {
                    const frameParams = {};
                    if (ftrScanIsFingerPresent(hDevice, frameParams)) {
                        await new Promise(r => setTimeout(r, 200));
                        if (ftrScanIsFingerPresent(hDevice, frameParams)) {
                            const buffer = Buffer.alloc(153600);
                            if (ftrScanGetImage(hDevice, 4, buffer)) {
                                const contrast = calculateContrast(buffer);
                                if (contrast > 55.0) {
                                    const processed = Buffer.alloc(buffer.length);
                                    for(let i=0; i<buffer.length; i++) processed[i] = 255 - buffer[i];
                                    broadcast({ type: 'IMAGE_DATA', image: processed.toString('base64'), template: null, width: 320, height: 480 });
                                    if (enrollTriggerPending) {
                                        enrollTriggerPending = false;
                                        setImmediate(() => executeEnrollWorker());
                                    }
                                }
                            }
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 150));
            }
        } finally {
            isCapturing = false;
            if (loopExitResolve) { loopExitResolve(); loopExitResolve = null; }
        }
    })();
}

async function stopCapture() {
    if (!isCapturing) return;
    isCapturing = false;
    const stopTimeout = new Promise(r => setTimeout(() => r('timeout'), 2000));
    const exitSignal = new Promise(r => { loopExitResolve = r; });
    await Promise.race([exitSignal, stopTimeout]);
    capturePromise = null;
}

function broadcast(data) {
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(data)); });
}

wss.on('connection', ws => {
    if (!hDevice) openDevice();
    ws.send(JSON.stringify({ type: 'DEVICE_STATUS', status: hDevice ? 'connected' : 'disconnected' }));
    ws.on('message', async msg => {
        if (isSDKOperating) return;
        try {
            const cmd = msg.toString();
            if (cmd === 'START_CAPTURE') await startCapture();
            else if (cmd === 'START_ENROLL') await enrollFinger();
            else if (cmd === 'STOP_CAPTURE') { await stopCapture(); closeDevice(); }
            else if (cmd.startsWith('IDENTIFY:')) {
                const data = JSON.parse(cmd.substring(9));
                const index = await identifyFinger(data.templates);
                ws.send(JSON.stringify({ type: 'IDENTIFY_RESULT', index }));
            } else if (cmd.startsWith('VERIFY:')) {
                const index = await verifyFinger(cmd.substring(7));
                ws.send(JSON.stringify({ type: 'VERIFY_RESULT', isSameFinger: index }));
            } else if (cmd.startsWith('MATCH_TEMPLATES:')) {
                const data = JSON.parse(cmd.substring(16));
                const res = await matchTemplates(data.templateA, data.templateB);
                ws.send(JSON.stringify({ type: 'MATCH_RESULT', success: res }));
            }
        } catch (e) {}
    });
    ws.on('close', () => { isCapturing = false; closeDevice(); });
});

process.on('SIGINT', () => { closeDevice(); process.exit(); });

function calculateContrast(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i];
    const mean = sum / buffer.length;
    let sumSqDiff = 0;
    for (let i = 0; i < buffer.length; i++) {
        const diff = buffer[i] - mean;
        sumSqDiff += diff * diff;
    }
    return Math.sqrt(sumSqDiff / buffer.length);
}
