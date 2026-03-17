import React, { useEffect, useRef, useState } from 'react';

const API_URL = 'http://localhost:3000/api';

export const BiometricScanner = ({ onScanSuccess, checkOnly = false, isRegistration = false, token = '' }) => {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const [bridgeStatus, setBridgeStatus] = useState('disconnected');
    const [scannerStatus, setScannerStatus] = useState('unknown');
    const [qualityMsg, setQualityMsg] = useState('');
    
    // Wizard State
    const [step, setStep] = useState(1); // 1, 2, 3
    const [capturedTemplates, setCapturedTemplates] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isIdentifyMode, setIsIdentifyMode] = useState(!isRegistration);
 
    // Refs to avoid stale closures in WS handlers
    const stepRef = useRef(1);
    const templatesRef = useRef([]);
    const onVerifyResultRef = useRef(null);
    const onIdentifyResultRef = useRef(null);
    const onMatchResultRef = useRef(null);
    const candidatesRef = useRef([]);

    // Sync refs with state
    useEffect(() => {
        stepRef.current = step;
        templatesRef.current = capturedTemplates;
    }, [step, capturedTemplates]);

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
                if (isRegistration) {
                    ws.send('START_ENROLL');
                } else {
                    ws.send('START_CAPTURE');
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'IMAGE_DATA') {
                        if (isRegistration) {
                            handleRegistrationStep(data.image, data.template);
                        } else {
                            handleIdentifyFlow(data.template);
                        }
                    } else if (data.type === 'VERIFY_RESULT') {
                        if (onVerifyResultRef.current) onVerifyResultRef.current(data.isSameFinger);
                    } else if (data.type === 'IDENTIFY_RESULT') {
                        if (onIdentifyResultRef.current) onIdentifyResultRef.current(data.index);
                    } else if (data.type === 'MATCH_RESULT') {
                        if (onMatchResultRef.current) onMatchResultRef.current(data.success);
                    } else if (data.type === 'STATUS') {
                        if (data.status === 'enroll_progress') {
                            setQualityMsg(data.message);
                            // Se o SDK diz que está pronto para processar, podemos tentar inferir passos
                            if (data.state === 3) { // FTR_STATE_READY_TO_PROCESS
                                setStep(prev => Math.min(prev + 1, 3));
                            }
                        } else if (data.status === 'low_quality') {
                            setQualityMsg(data.message);
                            setTimeout(() => setQualityMsg(''), 3000);
                        } else if (data.status === 'not_found') {
                            setErrorMsg('Digital não reconhecida.');
                            setTimeout(() => setErrorMsg(''), 3000);
                        }
                    } else if (data.type === 'ENROLL_RESULT') {
                        if (data.success) {
                            onScanSuccess(data.template);
                        } else {
                            setErrorMsg('Falha no cadastro biométrico. Tente novamente.');
                            setTimeout(() => ws.send('START_ENROLL'), 3000);
                        }
                    } else if (data.type === 'DEVICE_STATUS') {
                        setScannerStatus(data.status);
                        if (data.status === 'connected') {
                            if (isRegistration) ws.send('START_ENROLL');
                            else ws.send('START_CAPTURE');
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
    }, [onScanSuccess, isRegistration]);

    const isVerifyingRef = useRef(false);

    const handleRegistrationStep = async (image, template) => {
        if (isVerifyingRef.current) return;
        isVerifyingRef.current = true;
        setIsVerifying(true);
        setErrorMsg('');

        if (!template) {
            setErrorMsg('Falha na extração. Centralize o dedo e tente novamente.');
            setIsVerifying(false);
            isVerifyingRef.current = false;
            setTimeout(() => wsRef.current?.send('START_CAPTURE'), 1000);
            return;
        }

        try {
            const currentStep = stepRef.current;
            const currentTemplates = templatesRef.current; // Estes agora são templates oficiais

            if (currentStep === 1) {
                const newTemplates = [template];
                templatesRef.current = newTemplates;
                setCapturedTemplates(newTemplates);
                setStep(2);
                wsRef.current?.send('START_CAPTURE');
            } else {
                if (currentTemplates.length === 0) {
                    throw new Error("Histórico de capturas vazio. Reiniciando...");
                }

                // Comparar usando o Bridge (MATCH_TEMPLATES - off-line, mais robusto)
                const prevTemplate = currentTemplates[currentTemplates.length - 1];
                
                const isSame = await new Promise((resolve) => {
                    onMatchResultRef.current = resolve;
                    wsRef.current?.send(`MATCH_TEMPLATES:${JSON.stringify({ 
                        templateA: prevTemplate, 
                        templateB: template 
                    })}`);
                    // Timeout de segurança
                    setTimeout(() => resolve(false), 5000);
                });

                if (isSame) {
                    const newTemplates = [...currentTemplates, template];
                    templatesRef.current = newTemplates;
                    setCapturedTemplates(newTemplates);

                    if (currentStep === 3) {
                        onScanSuccess(template); // Envia o template oficial para o backend
                    } else {
                        const nextStep = currentStep + 1;
                        setStep(nextStep);
                        wsRef.current?.send('START_CAPTURE');
                    }
                } else {
                    setErrorMsg('Digital não confere com a captura anterior. Tente usar o mesmo dedo.');
                    setTimeout(() => {
                        wsRef.current?.send('START_CAPTURE');
                    }, 2000);
                }
            }
        } catch (e) {
            console.error('Erro na validação do passo:', e);
            setErrorMsg(`Erro: ${e.message}`);
            if (e.message.includes("vazio")) {
                setStep(1);
                setCapturedTemplates([]);
            }
            setTimeout(() => wsRef.current?.send('START_CAPTURE'), 3000);
        } finally {
            isVerifyingRef.current = false;
            setIsVerifying(false);
        }
    };

    const handleIdentifyFlow = async (liveTemplate) => {
        if (isVerifyingRef.current) return;
        isVerifyingRef.current = true;
        setIsVerifying(true);
        setErrorMsg('');

        try {
            // 1. Buscar candidatos se não houver em cache
            if (candidatesRef.current.length === 0) {
                const res = await fetch(`${API_URL}/biometria/candidatos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    candidatesRef.current = await res.json();
                }
            }

            if (candidatesRef.current.length === 0) {
                setErrorMsg('Nenhuma biometria cadastrada no sistema.');
                return;
            }

            // 2. Pedir pro Bridge identificar
            const index = await new Promise((resolve) => {
                onIdentifyResultRef.current = resolve;
                const templates = candidatesRef.current.map(c => c.template_biometrico);
                wsRef.current?.send(`IDENTIFY:${JSON.stringify({ templates })}`);
                setTimeout(() => resolve(-1), 10000);
            });

            if (index !== -1) {
                const match = candidatesRef.current[index];
                onScanSuccess(null, null, null, match.id); // Avisa o pai que identificou ID X
            } else {
                setErrorMsg('Digital não reconhecida.');
                setTimeout(() => wsRef.current?.send('START_CAPTURE'), 2000);
            }

        } catch (e) {
            console.error('Erro na identificação:', e);
            setErrorMsg('Erro ao identificar biometria.');
        } finally {
            isVerifyingRef.current = false;
            setIsVerifying(false);
        }
    };

    return (
        <div style={{ marginTop: '1rem', width: '100%' }}>
            {isRegistration && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                width: '40px',
                                height: '10px',
                                borderRadius: '5px',
                                backgroundColor: step >= s ? '#38a169' : '#e2e8f0',
                                transition: 'background-color 0.3s'
                            }} />
                        ))}
                    </div>
                    <p style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '1.1rem' }}>
                        Passo {step} de 3
                    </p>
                    <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {isVerifying ? 'Validando...' : (step === 1 ? 'Primeiro toque no leitor' : 'Toque novamente com o mesmo dedo')}
                    </p>
                    {errorMsg && (
                        <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 'bold', animation: 'shake 0.5s' }}>
                            {errorMsg}
                        </p>
                    )}
                </div>
            )}

            <div style={{ textAlign: 'center' }}>
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
        </div>
    );
};
