const koffi = require('koffi');
const WebSocket = require('ws');
const path = require('path');

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


// --- Carregando a DLL (Koffi) ---
const dllPath = path.join(__dirname, 'ftrScanAPI.dll');

let lib;
try {
    lib = koffi.load(dllPath);
    console.log(`[Bridge] DLL carregada com sucesso: ${dllPath}`);
} catch (e) {
    console.error(`[Bridge] Erro ao carregar DLL: ${e.message}`);
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

// Funções da DLL
// Usando variáveis de tipo
let ftrScanOpenDevice, ftrScanCloseDevice, ftrScanGetImageSize, ftrScanIsFingerPresent, ftrScanGetImage;

try {
    console.log('[Bridge] Mapeando ftrScanOpenDevice...');
    ftrScanOpenDevice = lib.func('__cdecl', 'ftrScanOpenDevice', FTRHANDLE, []);

    console.log('[Bridge] Mapeando ftrScanCloseDevice...');
    ftrScanCloseDevice = lib.func('__stdcall', 'ftrScanCloseDevice', 'void', [FTRHANDLE]);

    console.log('[Bridge] Mapeando ftrScanGetImageSize...');
    ftrScanGetImageSize = lib.func('__cdecl', 'ftrScanGetImageSize', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_IMAGE_SIZE)]);

    console.log('[Bridge] Mapeando ftrScanIsFingerPresent...');
    ftrScanIsFingerPresent = lib.func('__cdecl', 'ftrScanIsFingerPresent', 'int', [FTRHANDLE, koffi.out(PFTRSCAN_FRAME_PARAMETERS)]);

    console.log('[Bridge] Mapeando ftrScanGetImage...');
    ftrScanGetImage = lib.func('__cdecl', 'ftrScanGetImage', 'int', [FTRHANDLE, 'int', koffi.out(PBYTE)]);

    console.log('[Bridge] Funções da DLL mapeadas com sucesso.');
} catch (e) {
    console.error('[Bridge] Erro CRÍTICO ao mapear funções da DLL:', e);
    // Não dar exit, deixar tentar rodar para ver se algo funciona
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

// --- Loop de Captura ---
// --- Loop de Captura ---
// --- Loop de Captura ---
let lastDeviceStatus = 'unknown';
let captureInterval = null;

async function startCapture() {
    if (isCapturing) return;
    isCapturing = true;

    console.log('[Bridge] Iniciando loop de captura persistente...');

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
                // Continua tentando no próximo ciclo
                return;
            }
        }

        // 2. Com device aberto, verificar dedo
        if (hDevice) {
            const frameParams = {};
            try {
                let isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

                if (isPresent) {
                    console.log('[Bridge] Dedo detectado! Verificando estabilidade (1/2)...');
                    await new Promise(r => setTimeout(r, 200));

                    isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

                    if (isPresent) {
                        console.log('[Bridge] Dedo confirmado! Verificando estabilidade (2/2)...');
                        await new Promise(r => setTimeout(r, 200));

                        isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

                        if (isPresent) {
                            console.log('[Bridge] Dedo validado. Capturando...');

                            if (imageSize.nImageSize === 0) imageSize.nImageSize = 161904;
                            const buffer = Buffer.alloc(imageSize.nImageSize);
                            const captured = ftrScanGetImage(hDevice, 4, buffer);

                            if (captured) {
                                console.log('[Bridge] Imagem capturada com sucesso.');

                                // --- ANÁLISE DE QUALIDADE/CONTRASTE (Ajuste Fino) ---
                                // < 20.0: Provável ruído do leitor ou sujeira.
                                // 20.0 - 35.0: Toque leve, avisar usuário.
                                // > 35.0: Captura válida.
                                const contrast = calculateContrast(buffer);
                                console.log(`[Bridge] Contraste da Imagem: ${contrast.toFixed(2)}`);

                                if (contrast < 20.0) {
                                    // Ignora completamente sem interromper o loop (filtro de ruído)
                                    console.log('[Bridge] Contraste abaixo de 20.0 (Ruído). Ignorando.');
                                } else if (contrast < 35.0) {
                                    console.log('[Bridge] Contraste insuficiente (Toque Leve). Notificando frontend...');
                                    broadcast({
                                        type: 'STATUS',
                                        status: 'low_quality',
                                        message: 'Pressione o dedo com mais firmeza'
                                    });
                                } else {
                                    const base64Image = buffer.toString('base64');
                                    broadcast({
                                        type: 'IMAGE_DATA',
                                        image: base64Image,
                                        width: imageSize.nWidth,
                                        height: imageSize.nHeight
                                    });

                                    // Para o loop após uma captura de ALTA QUALIDADE
                                    isCapturing = false;
                                    clearInterval(captureInterval);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Bridge] Erro no loop (provavel desconexão):', e);
                closeDevice(); // Força reset do handle
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

    ws.on('message', message => {
        try {
            const cmd = message.toString();
            console.log(`[Bridge] Comando recebido: ${cmd}`);

            if (cmd === 'START_CAPTURE') {
                startCapture();
            } else if (cmd === 'STOP_CAPTURE') {
                isCapturing = false;
                closeDevice();
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
