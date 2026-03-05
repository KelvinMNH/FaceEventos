import React, { useEffect, useRef, useState } from 'react';

export const BiometricScanner = ({ onScanSuccess, checkOnly = false }) => {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [bridgeStatus, setBridgeStatus] = useState('disconnected');
    const [scannerStatus, setScannerStatus] = useState('unknown');
    const [qualityMsg, setQualityMsg] = useState('');

    useEffect(() => {
        const connectBridge = () => {
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            console.log('[Scanner] Tentando conectar ao Bridge...');
            const ws = new WebSocket('ws://localhost:4000');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Scanner] Bridge conectada');
                setBridgeStatus('connected');
                ws.send('START_CAPTURE');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'IMAGE_DATA') {
                        // Ao receber dado de imagem, enviamos para o callback
                        onScanSuccess(data.image, data.width, data.height);

                        // O leitor para após um sucesso ou tentativa? 
                        // Geralmente reiniciamos após um tempo no pai, mas aqui podemos sinalizar capturado.
                    } else if (data.type === 'STATUS') {
                        if (data.status === 'low_quality') {
                            setQualityMsg(data.message);
                            setTimeout(() => setQualityMsg(''), 3000);
                        }
                    } else if (data.type === 'DEVICE_STATUS') {
                        setScannerStatus(data.status);
                        if (data.status === 'connected') {
                            ws.send('START_CAPTURE');
                        }
                    }
                } catch (e) {
                    console.error('[Scanner] Erro ao processar mensagem', e);
                }
            };

            ws.onclose = () => {
                setBridgeStatus('disconnected');
                setScannerStatus('unknown');
                wsRef.current = null;
                reconnectTimeoutRef.current = setTimeout(connectBridge, 3000);
            };

            ws.onerror = () => {
                if (ws.readyState === WebSocket.OPEN) ws.close();
            };
        };

        connectBridge();

        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [onScanSuccess]);

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#e6fffa' : '#fffaf0') : '#fff5f5',
                border: `1px solid ${bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#38a169' : '#dd6b20') : '#e53e3e'}`,
                color: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#2f855a' : '#c05621') : '#c53030',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#48bb78' : '#ed8936') : '#f56565',
                    boxShadow: bridgeStatus === 'connected' && scannerStatus === 'connected' ? '0 0 8px #48bb78' : 'none'
                }}></div>
                {bridgeStatus === 'connected'
                    ? (scannerStatus === 'connected' ? 'Leitor Pronto' : 'Leitor Desconectado')
                    : 'Leitor Offline (Bridge)'}
            </div>
            {qualityMsg && (
                <p style={{ color: '#dd6b20', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                    ⚠️ {qualityMsg}
                </p>
            )}
        </div>
    );
};
