const koffi = require('koffi');
const WebSocket = require('ws');
const path = require('path');

// --- Configuração WebSocket ---
const WS_PORT = 4000;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`[Bridge] Servidor WebSocket rodando na porta ${WS_PORT}`);

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
    ftrScanCloseDevice = lib.func('__cdecl', 'ftrScanCloseDevice', 'void', [FTRHANDLE]);

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
async function startCapture(ws) {
    if (isCapturing) return;
    isCapturing = true;

    if (!openDevice()) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Leitor não detectado pelo Software.' }));
        // Não resetar isCapturing para evitar spam se for loop
        isCapturing = false;
        return;
    }

    console.log('[Bridge] Iniciando loop de captura...');
    ws.send(JSON.stringify({ type: 'STATUS', message: 'Aguardando dedo...' }));

    const frameParams = {}; // Placeholder
    const checkInterval = setInterval(() => {
        if (!isCapturing || !hDevice) {
            clearInterval(checkInterval);
            return;
        }

        try {
            // Verifica presença do dedo
            const isPresent = ftrScanIsFingerPresent(hDevice, frameParams);

            if (isPresent) {
                console.log('[Bridge] Dedo detectado! Capturando...');

                // Alocar buffer
                // Se imageSize for 0, usa default ou falha
                if (imageSize.nImageSize === 0) {
                    imageSize.nImageSize = 161904; // aprox para 320x480? Seguro?
                    // Melhor tentar pegar de novo ou falhar.
                }

                const buffer = Buffer.alloc(imageSize.nImageSize);

                // Capturar Imagem (nDose = 4 é comum para melhor contraste)
                const captured = ftrScanGetImage(hDevice, 4, buffer);

                if (captured) {
                    console.log('[Bridge] Imagem capturada com sucesso.');

                    // Converter para Base64 e enviar
                    const base64Image = buffer.toString('base64');
                    ws.send(JSON.stringify({
                        type: 'IMAGE_DATA',
                        image: base64Image,
                        width: imageSize.nWidth,
                        height: imageSize.nHeight
                    }));

                    isCapturing = false;
                    clearInterval(checkInterval);
                    closeDevice(); // Libera o device
                }
            }
        } catch (e) {
            console.error('[Bridge] Erro no loop:', e);
            clearInterval(checkInterval);
            isCapturing = false;
        }
    }, 200); // Checa a cada 200ms
}

// --- WebSocket Handlers ---
wss.on('connection', ws => {
    console.log('[Bridge] Cliente conectado via WebSocket');

    ws.on('message', message => {
        try {
            const cmd = message.toString();
            console.log(`[Bridge] Comando recebido: ${cmd}`);

            if (cmd === 'START_CAPTURE') {
                startCapture(ws);
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

// Tratamento de Encerramento do Processo
process.on('SIGINT', () => {
    closeDevice();
    process.exit();
});
