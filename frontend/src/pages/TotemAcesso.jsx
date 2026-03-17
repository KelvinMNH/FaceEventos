import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:3000/api';

const FingerprintIcon = ({ size = "1em", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94.28 0 .5.22.5.5s-.22.5-.5.5c-1.7 0-3.08-1.32-3.08-2.94 0-1.07-.93-1.94-2.08-1.94-1.15 0-2.08.87-2.08 1.94 0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z" />
    </svg>
);

function TotemAcesso() {
    const navigate = useNavigate();
    const { uuid } = useParams();
    const { token } = useAuth();
    const [evento, setEvento] = useState(null);
    const [horaAtual, setHoraAtual] = useState(new Date());

    // View State: 'welcome', 'search', 'confirm', 'success', 'error'
    const [view, setView] = useState('welcome');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [qualityMsg, setQualityMsg] = useState(''); // Novo: feedback de pressão do dedo

    // Wizard Registration States
    const [captureStep, setCaptureStep] = useState(1);
    const [capturedTemplates, setCapturedTemplates] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Refs to avoid stale closures in WS handlers
    const stepRef = useRef(1);
    const templatesRef = useRef([]);
    const isVerifyingRef = useRef(false);

    // Sync refs with state
    useEffect(() => {
        stepRef.current = captureStep;
        templatesRef.current = capturedTemplates;
    }, [captureStep, capturedTemplates]);


    const searchInputRef = useRef(null);

    const [scannedImage, setScannedImage] = useState(null);
    const wsRef = useRef(null);

    // Atualizar hora
    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // WebSocket Bridge Conexão
    useEffect(() => {
        let ws = null;
        let reconnectTimeout = null;

        const connectBridge = () => {
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

            try {
                ws = new WebSocket('ws://localhost:4000');
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('WS Bridge Conectado');
                    ws.send('START_CAPTURE');
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'IMAGE_DATA') {
                            setScannedImage({
                                buffer: data.image,
                                width: data.width,
                                height: data.height
                            });
                            handleBiometricScan(data);
                        } else if (data.type === 'STATUS') {
                            console.log('Bridge Status:', data.message);
                            if (data.status === 'low_quality') {
                                setQualityMsg(data.message);
                                setTimeout(() => setQualityMsg(''), 3000);
                            }
                        }
                    } catch (e) {
                        console.error('Erro WS msg:', e);
                    }
                };

                ws.onclose = () => {
                    console.log('WS Bridge Fechado. Reconectando em 3s...');
                    wsRef.current = null;
                    reconnectTimeout = setTimeout(connectBridge, 3000);
                };

                ws.onerror = (e) => {
                    console.log('WS Erro:', e);
                    if (ws.readyState === WebSocket.OPEN) ws.close();
                };

            } catch (e) {
                console.log('Erro conexão bridge', e);
                reconnectTimeout = setTimeout(connectBridge, 3000);
            }
        };

        connectBridge();

        return () => {
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (wsRef.current) {
                wsRef.current.onclose = null; // Evita loop no unmount
                wsRef.current.close();
            }
        };
    }, []);

    // Reiniciar captura ao voltar para tela inicial
    useEffect(() => {
        if (view === 'welcome' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('Reiniciando captura...');
            wsRef.current.send('START_CAPTURE');
        }
    }, [view]);

    const handleBiometricScan = async (data) => {
        if (isVerifyingRef.current) return;

        try {
            // Se estiver na tela de confirmação e tiver alguém selecionado, entra em fluxo de RE-REGISTRO (Wizard)
            if (view === 'confirm' && selectedParticipant) {
                isVerifyingRef.current = true;
                setIsVerifying(true);
                setErrorMsg('');

                try {
                    const currentStep = stepRef.current;
                    const currentTemplates = templatesRef.current;

                    if (currentStep === 1) {
                        setCapturedTemplates([data.image]);
                        setCaptureStep(2);
                        setErrorMsg('');
                        wsRef.current?.send('START_CAPTURE');
                    } else {
                        // Comparar com a captura anterior
                        const prevImage = currentTemplates[currentTemplates.length - 1];
                        
                        const resC = await fetch(`${API_URL}/biometria/comparar`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ templateA: prevImage, templateB: data.image })
                        });
                        
                        const resultC = await resC.json();
                        
                        if (resultC.isSameFinger) {
                            const newTemplates = [...currentTemplates, data.image];
                            if (currentStep === 3) {
                                // Sucesso total! Salvar a última imagem
                                const res = await fetch(`${API_URL}/renovar-biometria`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                        participanteId: selectedParticipant.id,
                                        template: data.image,
                                        eventoId: uuid
                                    })
                                });
                                const finalData = await res.json();
                                handleFinalResponse(finalData);
                            } else {
                                setCapturedTemplates(newTemplates);
                                setCaptureStep(currentStep + 1);
                                setErrorMsg('');
                                wsRef.current?.send('START_CAPTURE');
                            }
                        } else {
                            setErrorMsg('Digital não confere com a anterior. Tente usar o mesmo dedo.');
                            setTimeout(() => {
                                wsRef.current?.send('START_CAPTURE');
                            }, 2000);
                        }
                    }
                } catch (err) {
                    console.error('Erro no wizard:', err);
                    setErrorMsg('Erro na validação. Tente o mesmo dedo novamente.');
                    wsRef.current?.send('START_CAPTURE');
                } finally {
                    isVerifyingRef.current = false;
                    setIsVerifying(false);
                }
                return;
            }

            // Fluxo normal de SCAN
            const res = await fetch(`${API_URL}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    device_id: 'TOTEM_FS80H',
                    template: data.image,
                    eventoId: uuid
                })
            });
            const finalData = await res.json();
            handleFinalResponse(finalData);

        } catch (error) {
            console.error("Erro no scan:", error);
            isVerifyingRef.current = false;
            setStatusMessage("Erro de comunicação com o servidor.");
            setView('error');
            setTimeout(() => setView('welcome'), 3000);
        }
    };

    const handleFinalResponse = (finalData) => {
        if (finalData.autorizado || finalData.success) {
            const nome = finalData.participante ? finalData.participante.nome : "Participante";
            setStatusMessage(`Bem-vindo(a), ${nome}!`);
            setView('success');
            setTimeout(() => {
                setView('welcome');
                setSelectedParticipant(null);
                setCapturedTemplates([]);
                setCaptureStep(1);
                setScannedImage(null);
            }, 3000);
        } else {
            setStatusMessage(finalData.mensagem || "Biometria não identificada");
            setView('error');
            setTimeout(() => {
                if (view === 'confirm') {
                    setView('confirm');
                } else {
                    setView('welcome');
                }
                setSelectedParticipant(null);
                setCapturedTemplates([]);
                setCaptureStep(1);
                setScannedImage(null);
            }, 2000);
        }
    };

    // Buscar evento ativo
    useEffect(() => {
        const fetchEvento = async () => {
            if (!token || !uuid) return;
            try {
                const res = await fetch(`${API_URL}/eventos/${uuid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data) setEvento(data);
                else setView('error');
            } catch (e) {
                console.error(e);
                setView('error');
            }
        };
        fetchEvento();
    }, [token, uuid]);

    // Focar no input quando entrar na tela de busca
    useEffect(() => {
        if (view === 'search' && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [view]);

    // Busca manual
    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/participantes/busca?q=${term}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectParticipant = (p) => {
        setSelectedParticipant(p);
        setView('confirm');
        setCaptureStep(1);
        setCapturedTemplates([]);
        setErrorMsg('');
        setIsVerifying(false);
    };

    const handleConfirmCheckin = async () => {
        if (!selectedParticipant) return;

        try {
            // Verificar duplicidade antes de confirmar visualmente (embora backend bloqueie)
            const res = await fetch(`${API_URL}/manual-entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    participanteId: selectedParticipant.id,
                    eventoId: uuid
                })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage(`Bem-vindo(a), ${selectedParticipant.nome}!`);
                setView('success');
            } else {
                setStatusMessage(data.msg || "Erro ao registrar entrada");
                setView('error');
            }
        } catch (e) {
            setStatusMessage("Erro de comunicação");
            setView('error');
        }

        // Reset após delay
        setTimeout(() => {
            setView('welcome');
            setSearchTerm('');
            setSearchResults([]);
            setSelectedParticipant(null);
            setStatusMessage('');
        }, 4000);
    };

    // Simulação de Biometria (Mantida para testes)
    const simulateBiometricScan = async (success = true) => {
        if (view !== 'welcome') return; // Só aceita biometria na tela inicial

        if (success) {
            // Simular sucesso pegando um aleatório
            try {
                const res = await fetch(`${API_URL}/participantes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const parts = await res.json();
                if (parts && parts.length > 0) {
                    const p = parts[Math.floor(Math.random() * parts.length)];
                    setSelectedParticipant(p);
                    // Auto-confirma
                    handleConfirmCheckin();
                }
            } catch (e) { }
        } else {
            setStatusMessage("Biometria não reconhecida");
            setView('error');
            setTimeout(() => setView('welcome'), 3000);
        }
    };

    const formatDate = (date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formatTime = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
        }
        return cpf;
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Topbar */}
            <div style={{ backgroundColor: '#198754', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                {/* Lado Esquerdo: Logo */}
                <div style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ height: '60px', borderRadius: '4px', backgroundColor: 'white', padding: '2px' }} />
                </div>

                {/* Centro: Título e Informações do Evento */}
                <div style={{ flex: '2', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>Totem de Check-in</h1>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{evento ? evento.nome : 'Carregando...'}</div>
                    {evento && (
                        <div style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', gap: '1.5rem', marginTop: '0.3rem', justifyContent: 'center' }}>
                            <span>📅 {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}</span>
                            <span>🕐 {evento.hora_inicio}</span>
                            <span>📍 {evento.local}</span>
                        </div>
                    )}
                </div>

                {/* Lado Direito: Relógio */}
                <div style={{ flex: '1', textAlign: 'right' }}>
                    <div style={{ fontSize: '4.5rem', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: 1 }}>{formatTime(horaAtual)}</div>
                    <div style={{ fontSize: '1.6rem', marginTop: '5px' }}>{formatDate(horaAtual)}</div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'min-content' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Seja Bem-vindo(a)!</h2>

                        {/* Círculo do Totem agora com estilo idêntico ao Access Panel */}
                        <div
                            className="totem-circle totem-circle-animated"
                            style={{
                                width: 'min(200px, 25vh)',
                                height: 'min(200px, 25vh)',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                margin: '0 auto clamp(1rem, 3vh, 3rem)',
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                            }}
                        >
                            {/* A animação agora vem da classe .totem-circle-animated::before no index.css */}

                            {scannedImage ? (
                                <canvas
                                    ref={canvas => {
                                        if (canvas && scannedImage) {
                                            const ctx = canvas.getContext('2d');
                                            const { width, height, buffer } = scannedImage;
                                            canvas.width = width;
                                            canvas.height = height;

                                            // Converte Base64
                                            const binaryString = window.atob(buffer);
                                            const len = binaryString.length;
                                            const bytes = new Uint8Array(len);
                                            for (let i = 0; i < len; i++) {
                                                bytes[i] = binaryString.charCodeAt(i);
                                            }

                                            // Cria ImageData
                                            const imgData = ctx.createImageData(width, height);
                                            for (let i = 0; i < len; i++) {
                                                const val = bytes[i];
                                                imgData.data[i * 4] = val;
                                                imgData.data[i * 4 + 1] = val;
                                                imgData.data[i * 4 + 2] = val;
                                                imgData.data[i * 4 + 3] = 255;
                                            }
                                            ctx.putImageData(imgData, 0, 0);
                                        }
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', position: 'relative', zIndex: 2 }}
                                />
                            ) : (
                                <span style={{ fontSize: '6rem', position: 'relative', zIndex: 2 }}>👆</span>
                            )}
                        </div>

                        <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
                            {scannedImage ? 'Processando biometria...' : (
                                qualityMsg ? (
                                    <span style={{ color: '#FF9800', animation: 'shake 0.5s infinite' }}>⚠️ {qualityMsg}</span>
                                ) : 'Posicione seu dedo no leitor biométrico'
                            )}
                        </p>

                        <button
                            onClick={() => setView('search')}
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#00995D', color: 'white',
                                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(25,135,84,0.3)',
                                transition: 'transform 0.2s', fontWeight: 'bold'
                            }}
                        >
                            🔍 Localizar meu Cadastro
                        </button>
                    </div>
                )}

                {view === 'search' && (
                    <div style={{ width: '100%', maxWidth: '800px', animation: 'slideUp 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <button
                            onClick={() => { setView('welcome'); setSearchTerm(''); setSearchResults([]); }}
                            style={{
                                padding: '1rem 2.5rem',
                                backgroundColor: '#e9ecef',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '1.4rem',
                                cursor: 'pointer',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#495057',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                            }}
                        >
                            ⬅ Voltar
                        </button>

                        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>Buscar Participante</h2>

                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Digite seu Nome, CPF ou CRM..."
                            value={searchTerm}
                            onChange={e => handleSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '1.5rem', fontSize: '1.5rem', borderRadius: '12px',
                                border: '2px solid #ddd', marginBottom: '2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                            }}
                        />

                        {searchResults.length > 0 ? (
                            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', maxHeight: '50vh', overflowY: 'auto' }}>
                                {searchResults.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectParticipant(p)}
                                        style={{
                                            backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #eee',
                                            transition: 'transform 0.1s',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{p.nome}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span>CPF: {maskCPF(p.cpf)}</span>
                                                {p.crm && <span style={{ color: '#2c3e50', fontWeight: '500' }}>CRM: {p.crm}</span>}
                                                {p.especialidade && <span style={{ color: '#0d6efd', fontSize: '0.85rem', fontStyle: 'italic' }}>{p.especialidade}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                                                <span title="Biometria Cadastrada" style={{ color: '#4CAF50', display: 'flex' }}><FingerprintIcon size="2rem" /></span>
                                            ) : (
                                                <span title="Sem Biometria" style={{ color: '#666', opacity: 0.3, filter: 'grayscale(100%)', display: 'flex' }}><FingerprintIcon size="2rem" /></span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            searchTerm.length > 2 && <p style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>Nenhum resultado encontrado.</p>
                        )}
                    </div>
                )}

                {view === 'confirm' && selectedParticipant && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%', width: '100%', maxWidth: '700px' }}>
                        <div style={{ fontSize: 'clamp(2rem, 4vh, 3rem)', marginBottom: '0.5rem' }}>👤</div>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 1.8rem)', marginBottom: '0.5rem' }}>Confirmar Identidade</h2>
                        
                        <div style={{ fontSize: 'clamp(1.4rem, 2.5vh, 1.8rem)', fontWeight: 'bold', color: '#198754', marginBottom: '0.5rem' }}>
                            {selectedParticipant.nome}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: 'clamp(1rem, 2vh, 1.5rem)' }}>
                            CPF: {maskCPF(selectedParticipant.cpf)}
                        </div>

                        {/* Capture Wizard UI */}
                        <div style={{ 
                            padding: 'clamp(1rem, 2vh, 2rem)', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '16px', 
                            border: '1px solid #dee2e6',
                            marginBottom: 'clamp(1rem, 3vh, 2rem)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                                {[1, 2, 3].map(s => (
                                    <div key={s} style={{
                                        width: '60px',
                                        height: '12px',
                                        borderRadius: '6px',
                                        backgroundColor: captureStep >= s ? '#198754' : '#e9ecef',
                                        transition: 'all 0.3s ease',
                                        boxShadow: captureStep === s ? '0 0 10px rgba(25,135,84,0.3)' : 'none'
                                    }} />
                                ))}
                            </div>

                            <div style={{ fontSize: 'clamp(2.5rem, 5vh, 3.5rem)', marginBottom: '1rem', animation: isVerifying ? 'pulse 1.5s infinite' : 'bounce 2s infinite' }}>👆</div>
                            
                            <h3 style={{ fontSize: '1.4rem', color: '#198754', marginBottom: '0.5rem' }}>
                                Toque {captureStep} de 3
                            </h3>
                            
                            <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                {isVerifying ? 'Processando...' : (captureStep === 1 ? 'Encoste o dedo no leitor' : 'Encoste o MESMO dedo novamente')}
                            </p>

                            {errorMsg && (
                                <p style={{ color: '#dc3545', fontWeight: 'bold', animation: 'shake 0.5s', padding: '0.5rem', backgroundColor: '#fff5f5', borderRadius: '8px', border: '1px solid #feb2b2' }}>
                                    ⚠️ {errorMsg}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 'auto' }}>
                            <button
                                onClick={() => {
                                    setView('search');
                                    setCaptureStep(1);
                                    setCapturedTemplates([]);
                                }}
                                style={{
                                    padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#e9ecef', color: '#495057',
                                    border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConfirmCheckin()}
                                style={{
                                    padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#6c757d', color: 'white',
                                    border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500'
                                }}
                            >
                                Pular Biometria
                            </button>
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div style={{ textAlign: 'center', animation: 'popIn 0.5s' }}>
                        <div style={{ fontSize: '6rem', color: '#198754', marginBottom: '1rem' }}>✅</div>
                        <h2 style={{ fontSize: '2.5rem', color: '#198754', marginBottom: '1rem' }}>Entrada Confirmada!</h2>
                        <p style={{ 
                            fontSize: '1.5rem', 
                            color: '#333',
                            maxWidth: '90vw',
                            margin: '0 auto',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }} title={statusMessage}>
                            {statusMessage}
                        </p>
                    </div>
                )}

                {view === 'error' && (
                    <div style={{ textAlign: 'center', animation: 'shake 0.5s' }}>
                        <div style={{ fontSize: '6rem', color: '#dc3545', marginBottom: '1rem' }}>🚫</div>
                        <h2 style={{ fontSize: '2.5rem', color: '#dc3545', marginBottom: '1rem' }}>Atenção</h2>
                        <p style={{ fontSize: '1.5rem', color: '#333' }}>{statusMessage || 'Erro ao processar'}</p>
                    </div>
                )}
            </div>

            {/* Hidden Simulation Buttons (for debug/demo) */}
            <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', opacity: 0.1 }}>
                <button onClick={() => simulateBiometricScan(true)}>Simular Entrada</button>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            `}</style>
        </div>
    );
}

export default TotemAcesso;
