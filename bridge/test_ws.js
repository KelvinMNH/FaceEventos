const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000');

ws.on('open', function open() {
    console.log('WS Open: Conectado ao Bridge');
    ws.send('START_CAPTURE');
});

ws.on('message', function incoming(data) {
    try {
        const json = JSON.parse(data);
        console.log('WS Message:', json.type);
        if (json.type === 'IMAGE_DATA') {
            console.log('Imagem recebida! (Tamanho: ' + json.image.length + ' bytes)');
            ws.close();
        } else if (json.type === 'STATUS') {
            console.log('Status:', json.message);
        } else if (json.type === 'ERROR') {
            console.error('Erro do Bridge:', json.message);
        }
    } catch (e) {
        console.log('Mensagem bruta:', data.toString());
    }
});

ws.on('error', (e) => console.error('WS Error:', e.message));
ws.on('close', () => console.log('WS Closed'));
