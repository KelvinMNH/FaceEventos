const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Logger persistente
const LOG_FILE = path.join(__dirname, 'bridge_debug.log');
function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, formatted, { encoding: 'utf8' });
    } catch (e) {
        // Fallback se falhar escrita
    }
}

// --- Configuração WebSocket ---
const WS_PORT = 4000;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`[Bridge] Servidor WebSocket inciando na porta ${WS_PORT}...`);

wss.on('listening', () => {
    console.log(`[Bridge] Servidor WebSocket OUVINDO na porta ${WS_PORT}`);
});

wss.on('error', (err) => {
    console.error(`[Bridge] Erro no WebSocket Server:`, err);
});

process.on('uncaughtException', (err) => {
    console.error(`[Bridge] Exceção Não Tratada:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[Bridge] Rejeição Não Tratada:`, reason);
});


const koffi = require('koffi');

// --- Carregando a DLL (Koffi) ---
const dllScan = path.join(__dirname, 'ftrScanAPI.dll');
const dllApi = path.join(__dirname, 'FTRAPI.dll');

let libScan, libApi;
try {
    libScan = koffi.load(dllScan);
    console.log(`[Bridge] ftrScanAPI.dll carregada.`);
    
    libApi = koffi.load(dllApi);
    console.log(`[Bridge] FTRAPI.dll carregada.`);
} catch (e) {
    console.error(`[Bridge] Erro ao carregar DLLs: ${e.message}`);
    process.exit(1);
}

// --- Definição de Tipos e Funções ---
// Definindo tipos explicitamente
const FTRHANDLE = koffi.pointer('FTRHANDLE', koffi.opaque());
const PFTRHANDLE = koffi.pointer(FTRHANDLE);

// Struct: FTRSCAN_IMAGE_SIZE
const FTRSCAN_IMAGE_SIZE = koffi.struct('FTRSCAN_IMAGE_SIZE', {
    nWidth: 'int',
    nHeight: 'int',
    nImageSize: 'int'
});
const PFTRSCAN_IMAGE_SIZE = koffi.pointer(FTRSCAN_IMAGE_SIZE);

// Struct: FTRSCAN_FRAME_PARAMETERS
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

// Buffer
const PBYTE = koffi.pointer('uint8_t'); // Pointer to byte

// --- FTRAPI Structs ---
const FTR_DATA = koffi.struct('FTR_DATA', {
    dwSize: 'uint32',
    pData: koffi.pointer('uint8_t')
});
const PFTR_DATA = koffi.pointer(FTR_DATA);

const FTR_BITMAP = koffi.struct('FTR_BITMAP', {
    dwWidth: 'uint32',
    dwHeight: 'uint32',
    pData: koffi.pointer('uint8_t')
});
const PFTR_BITMAP = koffi.pointer(FTR_BITMAP);

const FTR_IDENTIFY_RECORD = koffi.struct('FTR_IDENTIFY_RECORD', {
    KeyValue: 'uint32', // User Context or ID
    pData: PFTR_DATA
});
const PFTR_IDENTIFY_RECORD = koffi.pointer(FTR_IDENTIFY_RECORD);

const FTR_IDENTIFY_ARRAY = koffi.struct('FTR_IDENTIFY_ARRAY', {
    TotalNumber: 'uint32',
    pRecords: koffi.pointer(FTR_IDENTIFY_RECORD)
});
const PFTR_IDENTIFY_ARRAY = koffi.pointer(FTR_IDENTIFY_ARRAY);

// Callbacks
const FTR_CB_GET_FRAME = koffi.proto('__stdcall', 'FTR_CB_GET_FRAME', 'uint32', ['uintptr_t', PFTR_BITMAP]);
const PFTR_CB_GET_FRAME = koffi.pointer(FTR_CB_GET_FRAME);

// Funções da DLL
// Usando variáveis de tipo
let ftrScanOpenDevice, ftrScanCloseDevice, ftrScanGetImageSize, ftrScanIsFingerPresent, ftrScanGetImage;

try {
    console.log('[Bridge] Mapeando ftrScanAPI...');
    ftrScanOpenDevice = libScan.func('__cdecl', 'ftrScanOpenDevice', FTRHANDLE, []);
    ftrScanCloseDevice = libScan.func('__stdcall', 'ftrScanCloseDevice', 'void', [FTRHANDLE]);
    ftrScanGetImageSize = libScan.func('__cdecl', 'ftrScanGetImageSize', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_IMAGE_SIZE)]);
    ftrScanIsFingerPresent = libScan.func('__cdecl', 'ftrScanIsFingerPresent', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_FRAME_PARAMETERS)]);
    ftrScanGetImage = libScan.func('__cdecl', 'ftrScanGetImage', 'int', [FTRHANDLE, 'int', koffi.out(PBYTE)]);

    console.log('[Bridge] Mapeando FTRAPI...');
    FTRInitialize = libApi.func('__stdcall', 'FTRInitialize', 'uint32', []);
    FTRTerminate = libApi.func('__stdcall', 'FTRTerminate', 'uint32', []);
    FTRSetParam = libApi.func('__stdcall', 'FTRSetParam', 'uint32', ['uint32', 'uintptr_t']);
    FTREnroll = libApi.func('__stdcall', 'FTREnroll', 'uint32', ['uintptr_t', 'uint32', PFTR_DATA]);
    FTRIdentify = libApi.func('__stdcall', 'FTRIdentify', 'uint32', ['uintptr_t', PFTR_IDENTIFY_ARRAY, koffi.out('uint32')]);
    FTRVerify = libApi.func('__stdcall', 'FTRVerify', 'uint32', ['uintptr_t', PFTR_DATA, koffi.out('int')]);
    FTRVerifyTemplate = libApi.func('__stdcall', 'FTRVerifyTemplate', 'uint32', ['uintptr_t', PFTR_DATA, PFTR_DATA, koffi.out('int')]);
    
    try {
        FTRExtract = libApi.func('__stdcall', 'FTRExtract', 'uint32', ['uintptr_t', 'uint32', PFTR_DATA]);
    } catch (e) {
        console.log('[Bridge] FTRExtract não disponível nesta versão do SDK. Usando FTREnroll.');
    }

    console.log('[Bridge] Inicializando FTRAPI...');
    if (FTRInitialize() === 0) {
        logDebug('[Bridge] FTRAPI Inicializada com sucesso.');
        // FTR_PARAM_MATCHING_THRESHOLD = 3
        // Valores: 1-9. Default costuma ser 5.
        FTRSetParam(3, 3); // Baixando para 3 (Mais tolerante) para o cadastro
        logDebug('[Bridge] Matching Threshold ajustado para 3 (Tolerante).');
    } else {
        console.warn('[Bridge] Falha ao inicializar FTRAPI.');
    }

} catch (e) {
    console.error('[Bridge] Erro CRÍTICO ao mapear funções:', e);
}

// --- Estado do Leitor ---
let hDevice = null;
let imageSize = { nWidth: 0, nHeight: 0, nImageSize: 0 };
let isCapturing = false;

// --- Funções Auxiliares ---

function openDevice() {
    if (hDevice) return true;
    try {
        console.log('[Bridge] Tentando abrir dispositivo...');
        hDevice = ftrScanOpenDevice();
        if (hDevice) {
            console.log('[Bridge] Leitor detectado e aberto! Handle:', hDevice);

            // Obter tamanho da imagem
            const sizeStruct = {}; // Koffi preencherá
            console.log('[Bridge] Obtendo tamanho da imagem...');
            const success = ftrScanGetImageSize(hDevice, sizeStruct);
            if (success) {
                imageSize = sizeStruct;
                // Fallback de segurança para FS80H
                if (imageSize.nWidth === 0) imageSize.nWidth = 320;
                if (imageSize.nHeight === 0) imageSize.nHeight = 480;
                if (imageSize.nImageSize === 0) imageSize.nImageSize = 161904;

                console.log(`[Bridge] Tamanho da Imagem: ${imageSize.nWidth}x${imageSize.nHeight} (${imageSize.nImageSize} bytes)`);
            } else {
                console.error('[Bridge] Falha ao obter tamanho da imagem.');
            }
            return true;
        } else {
            console.log('[Bridge] Leitor não encontrado (hDevice null).');
            return false;
        }
    } catch (e) {
        console.error('[Bridge] Erro ao abrir device:', e);
        return false;
    }
}

function closeDevice() {
    if (hDevice) {
        try {
            ftrScanCloseDevice(hDevice);
        } catch (e) { console.error('Erro ao fechar device:', e); }
        hDevice = null;
        console.log('[Bridge] Leitor fechado.');
    }
}

// --- FTRAPI Callbacks e Helpers ---
let currentCaptureBuffer = null;

const getFrameCallback = koffi.register((context, pBitmap) => {
    try {
        if (!currentCaptureBuffer) return 0x20000001;

        const bitmap = pBitmap[0];
        // logDebug(`[Bridge] Callback GetFrame: dwWidth=${bitmap.dwWidth}, dwHeight=${bitmap.dwHeight}`);
        
        // Garantir que temos um buffer de destino
        if (!bitmap.pData) {
            logDebug('[Bridge] Callback GetFrame: bitmap.pData é nulo!');
            return 0;
        }

        bitmap.dwWidth = 320;
        bitmap.dwHeight = 480;
        
        // Copiar dados para o ponteiro da DLL
        // Usando Buffer.copy se possível, ou loop
        const arrDest = new Uint8Array(bitmap.pData.buffer, bitmap.pData.byteOffset, 153600);
        arrDest.set(currentCaptureBuffer);
        
        return 0; // FTR_RET_OK
    } catch (e) {
        logDebug(`[Bridge] Erro no Callback GetFrame: ${e.message}`);
        return 1; // General Error
    }
}, PFTR_CB_GET_FRAME);

async function identifyFinger(templatesBase64) {
    let allocatedBuffers = [];
    try {
        console.log(`[Bridge] Iniciando identificação entre ${templatesBase64.length} candidatos...`);
        
        // 1. Preparar o array de identificação
        const count = templatesBase64.length;
        const records = koffi.alloc(FTR_IDENTIFY_RECORD, count);
        
        for (let i = 0; i < count; i++) {
            const templateBuffer = Buffer.from(templatesBase64[i], 'base64');
            const dataPtr = koffi.alloc('uint8_t', templateBuffer.length);
            for (let b = 0; b < templateBuffer.length; b++) dataPtr[b] = templateBuffer[b];
            
            allocatedBuffers.push(dataPtr);
            
            const record = records[i];
            record.KeyValue = i; // Retornaremos o índice
            record.pData = {
                dwSize: templateBuffer.length,
                pData: dataPtr
            };
        }
        
        const identifyArray = {
            TotalNumber: count,
            pRecords: records
        };

        // 2. Loop para aguardar dedo
        let identifiedIndex = -1;
        let captureLoopActive = true;
        let timeout = Date.now() + 30000; // 30s timeout

        while (captureLoopActive && Date.now() < timeout) {
            const frameParams = {};
            if (ftrScanIsFingerPresent(hDevice, frameParams)) {
                await new Promise(r => setTimeout(r, 500)); // Estabilidade
                if (ftrScanIsFingerPresent(hDevice, frameParams)) {
                    const buffer = Buffer.alloc(imageSize.nImageSize);
                    if (ftrScanGetImage(hDevice, 4, buffer)) {
                        currentCaptureBuffer = buffer;
                        const cbAddr = koffi.address(getFrameCallback);
                        FTRSetParam(1, cbAddr);

                        let pIndexArr = [0];
                        const result = FTRIdentify(0, identifyArray, pIndexArr);
                        
                        if (result === 0) {
                            identifiedIndex = pIndexArr[0]; // Agora pegamos o valor do array/ponteiro
                            console.log(`[Bridge] Dedo identificado! Índice: ${identifiedIndex}`);
                            captureLoopActive = false;
                        } else if (result === 0x20000002 || result === 536870914) { // FTR_RET_NOT_FOUND (0x20000002)
                            // Tentar novamente ou avisar que não reconheceu
                            broadcast({ type: 'STATUS', status: 'not_found', message: 'Digital não reconhecida' });
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }
            }
            await new Promise(r => setTimeout(r, 200));
        }

        // 3. Cleanup
        allocatedBuffers.forEach(ptr => { /* Koffi doesn't have a direct free for pointers yet in all versions, but we should null them */ });
        
        return identifiedIndex;

    } catch (e) {
        console.error('[Bridge] Erro na identificação:', e);
        return -1;
    } finally {
        currentCaptureBuffer = null;
    }
}

async function matchTemplates(base64A, base64B) {
    try {
        logDebug('[Bridge] Comparando dois templates (Off-line)...');
        const bufA = Buffer.from(base64A, 'base64');
        const bufB = Buffer.from(base64B, 'base64');

        logDebug(`[Bridge] Tamanho A: ${bufA.length}, B: ${bufB.length}`);

        // Alocação explícita de memória via Koffi
        const pDataA = koffi.alloc('uint8_t', bufA.length);
        const pDataB = koffi.alloc('uint8_t', bufB.length);
        
        const arrA = new Uint8Array(pDataA.buffer, pDataA.byteOffset, bufA.length);
        const arrB = new Uint8Array(pDataB.buffer, pDataB.byteOffset, bufB.length);
        arrA.set(bufA);
        arrB.set(bufB);

        const dataA = { dwSize: bufA.length, pData: pDataA };
        const dataB = { dwSize: bufB.length, pData: pDataB };

        let pResult = [0];
        const result = FTRVerifyTemplate(0, dataA, dataB, pResult);

        if (result !== 0) {
            logDebug(`[Bridge] FTRVerifyTemplate falhou com código: 0x${result.toString(16)}`);
        }

        logDebug(`[Bridge] Resultado Match: 0x${result.toString(16)}, IsMatch: ${pResult[0]}`);
        return result === 0 && pResult[0] !== 0;
    } catch (e) {
        logDebug(`[Bridge] Erro no MatchTemplates: ${e.message}`);
        return false;
    }
}

async function verifyFinger(templateBase64) {
    if (!templateBase64) return false;
    try {
        logDebug('[Bridge] Verificando 1-para-1 contra captura ao vivo...');
        const templateBuffer = Buffer.from(templateBase64, 'base64');
        const pTemplate = koffi.alloc('uint8_t', templateBuffer.length);
        const arrT = new Uint8Array(pTemplate.buffer, pTemplate.byteOffset, templateBuffer.length);
        arrT.set(templateBuffer);

        const templateData = {
            dwSize: templateBuffer.length,
            pData: pTemplate
        };

        // Captura rápida para verificação
        const buffer = Buffer.alloc(imageSize.nImageSize || 153600);
        if (ftrScanGetImage(hDevice, 4, buffer)) {
            currentCaptureBuffer = buffer;
            const cbAddr = koffi.address(getFrameCallback);
            FTRSetParam(1, cbAddr);
            let pResult = [0];
            const result = FTRVerify(0, templateData, pResult);
            logDebug(`[Bridge] Resultado FTRVerify: 0x${result.toString(16)}, IsMatch: ${pResult[0]}`);
            return result === 0 && pResult[0] !== 0;
        }
        return false;
    } catch (e) {
        logDebug(`[Bridge] Erro na verificação: ${e.message}`);
        return false;
    } finally {
        currentCaptureBuffer = null;
    }
}
async function extractTemplateFromBuffer(buffer) {
    try {
        currentCaptureBuffer = buffer;
        
        // Registrar callback para FTRAPI
        const cbAddr = koffi.address(getFrameCallback);
        FTRSetParam(1, cbAddr); // 1 = FTR_CB_GET_FRAME

        const templateData = { dwSize: 0, pData: null };
        
        // Mudamos Purpose para 0 (Identify) para ser o mais tolerante possível.
        // Identify (0) costuma extrair o template mesmo com qualidade inferior.
        const dwPurpose = 0; // FTR_PURPOSE_IDENTIFY
        logDebug(`[Bridge] Extraindo template com Purpose: ${dwPurpose}`);

        // 1. Obter o tamanho necessário
        let result;
        if (typeof FTRExtract === 'function') {
            result = FTRExtract(0, dwPurpose, templateData);
        } else {
            result = FTREnroll(0, dwPurpose, templateData);
        }

        if (result === 0 && templateData.dwSize > 0) {
            // 2. Alocar e extrair de fato
            templateData.pData = koffi.alloc('uint8_t', templateData.dwSize);
            
            if (typeof FTRExtract === 'function') {
                result = FTRExtract(0, dwPurpose, templateData);
            } else {
                result = FTREnroll(0, dwPurpose, templateData);
            }

            if (result === 0) {
                // Converter para Buffer do Node para transformar em Base64
                const outBuffer = Buffer.alloc(templateData.dwSize);
                const arrSource = new Uint8Array(templateData.pData.buffer, templateData.pData.byteOffset, templateData.dwSize);
                outBuffer.set(arrSource);

                const base64 = outBuffer.toString('base64');
                logDebug(`[Bridge] Template extraído com sucesso (${templateData.dwSize} bytes). Purpose: ${dwPurpose}`);
                return base64;
            }
        }
        
        logDebug(`[Bridge] Falha ao extrair template. Erro: 0x${result ? result.toString(16) : '??'}`);
        return null;
    } catch (e) {
        logDebug(`[Bridge] Erro na extração de template: ${e.message}`);
        return null;
    } finally {
        currentCaptureBuffer = null;
    }
}

// --- Loop de Captura ---
// --- Loop de Captura ---
// --- Loop de Captura ---
let lastDeviceStatus = 'unknown';
let captureInterval = null;

async function startCapture() {
    if (isCapturing) return;
    isCapturing = true;

    logDebug('[Bridge] Iniciando loop de captura persistente...');

    if (captureInterval) clearInterval(captureInterval);

    captureInterval = setInterval(async () => {
        if (!isCapturing) {
            clearInterval(captureInterval);
            return;
        }

        // 1. Se não temos device, tentar abrir
        if (!hDevice) {
            const success = openDevice();
            if (success) {
                if (lastDeviceStatus !== 'connected') {
                    lastDeviceStatus = 'connected';
                    broadcast({ type: 'DEVICE_STATUS', status: 'connected', message: 'Leitor Conectado' });
                }
            } else {
                if (lastDeviceStatus !== 'disconnected') {
                    lastDeviceStatus = 'disconnected';
                    broadcast({ type: 'DEVICE_STATUS', status: 'disconnected', message: 'Leitor Desconectado' });
                }
                return;
            }
        }

        // 2. Com device aberto, verificar dedo
        if (hDevice) {
            const frameParams = {};
            try {
                let isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

                if (isPresent) {
                    // Estabilidade rápida (200ms) para evitar SLOW_SAMPLING (0x3) no SDK
                    await new Promise(r => setTimeout(r, 200));
                    isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

                    if (isPresent) {
                        logDebug('[Bridge] Dedo validado. Capturando...');
                        if (imageSize.nImageSize === 0) imageSize.nImageSize = 161904;
                        const buffer = Buffer.alloc(imageSize.nImageSize);
                        const captured = ftrScanGetImage(hDevice, 4, buffer);

                        if (captured) {
                            const contrast = calculateContrast(buffer);
                            logDebug(`[Bridge] Contraste: ${contrast.toFixed(2)}`);

                            if (contrast < 20.0) {
                                logDebug('[Bridge] Ruído detectado (Contraste < 20). Ignorando.');
                            } else if (contrast < 35.0) {
                                broadcast({
                                    type: 'STATUS',
                                    status: 'low_quality',
                                    message: 'Pressione com mais firmeza'
                                });
                            } else {
                                const base64Image = buffer.toString('base64');
                                const template = await extractTemplateFromBuffer(buffer);

                                broadcast({
                                    type: 'IMAGE_DATA',
                                    image: base64Image,
                                    template: template,
                                    width: imageSize.nWidth,
                                    height: imageSize.nHeight
                                });

                                // Para o loop após uma captura de sucesso
                                isCapturing = false;
                                clearInterval(captureInterval);
                            }
                        }
                    }
                }
            } catch (e) {
                logDebug(`[Bridge] Erro no loop de captura: ${e.message}`);
                closeDevice();
                if (lastDeviceStatus !== 'disconnected') {
                    lastDeviceStatus = 'disconnected';
                    broadcast({ type: 'DEVICE_STATUS', status: 'disconnected', message: 'Leitor Desconectado' });
                }
            }
        }
    }, 500);
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// --- WebSocket Handlers ---
wss.on('connection', ws => {
    console.log('[Bridge] Cliente conectado via WebSocket');

    // Enviar status atual imediatamente
    if (lastDeviceStatus !== 'unknown') {
        const message = lastDeviceStatus === 'connected' ? 'Leitor Conectado' : 'Leitor Desconectado';
        ws.send(JSON.stringify({ type: 'DEVICE_STATUS', status: lastDeviceStatus, message: message }));
    }

    ws.on('message', async message => {
        try {
            const cmd = message.toString();
            console.log(`[Bridge] Comando recebido: ${cmd}`);

            if (cmd === 'START_CAPTURE') {
                startCapture();
            } else if (cmd === 'STOP_CAPTURE') {
                isCapturing = false;
                closeDevice();
            } else if (cmd.startsWith('IDENTIFY:')) {
                try {
                    const data = JSON.parse(cmd.substring(9));
                    const index = await identifyFinger(data.templates);
                    ws.send(JSON.stringify({ type: 'IDENTIFY_RESULT', index }));
                } catch (e) {
                    console.error('[Bridge] Erro comando IDENTIFY:', e);
                }
            } else if (cmd.startsWith('VERIFY:')) {
                try {
                    const template = cmd.substring(7);
                    const isSame = await verifyFinger(template);
                    ws.send(JSON.stringify({ type: 'VERIFY_RESULT', isSameFinger: isSame }));
                } catch (e) {
                    console.error('[Bridge] Erro comando VERIFY:', e);
                }
            } else if (cmd.startsWith('MATCH_TEMPLATES:')) {
                try {
                    const data = JSON.parse(cmd.substring(16));
                    const matchResult = await matchTemplates(data.templateA, data.templateB);
                    ws.send(JSON.stringify({ type: 'MATCH_RESULT', success: matchResult }));
                } catch (e) {
                    console.error('[Bridge] Erro comando MATCH_TEMPLATES:', e);
                }
            }
        } catch (e) {
            console.error('[Bridge] Erro msg:', e);
        }
    });

    ws.on('close', () => {
        console.log('[Bridge] Cliente desconectado');
        isCapturing = false;
        closeDevice();
    });
});

process.on('SIGINT', () => {
    closeDevice();
    process.exit();
});

function calculateContrast(buffer) {
    let sum = 0;
    const len = buffer.length;
    for (let i = 0; i < len; i++) sum += buffer[i];
    const mean = sum / len;

    let sumSqDiff = 0;
    for (let i = 0; i < len; i++) {
        const diff = buffer[i] - mean;
        sumSqDiff += diff * diff;
    }
    const variance = sumSqDiff / len;
    return Math.sqrt(variance);
}
