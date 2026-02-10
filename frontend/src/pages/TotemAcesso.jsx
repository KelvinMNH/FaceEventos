import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:3000/api';

function TotemAcesso() {
    const navigate = useNavigate();
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
        // Enviar para API verificar
        // NOTA: O backend espera template string para achar "exact match". 
        // Imagem raw não vai dar match. Mas vamos enviar para logar tentativa.
        try {
            const res = await fetch(`${API_URL}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    device_id: 'TOTEM_FS80H',
                    template: data.image // Enviando imagem como template (provisório) 
                })
            });
            const resp = await res.json();
            if (resp.autorizado && resp.participante) {
                setStatusMessage(`Bem-vindo(a), ${resp.participante.nome}!`);
                setView('success');
                setTimeout(() => { setView('welcome'); setScannedImage(null); }, 2000);
            } else {
                // Se falhar (o que vai acontecer sem matching real), mostramos erro
                setStatusMessage(resp.mensagem || "Biometria não identificada");
                setView('error');
                setTimeout(() => { setView('welcome'); setScannedImage(null); }, 2000);
            }
        } catch (e) {
            console.error('Erro API Scan', e);
        }
    };

    // Buscar evento ativo
    useEffect(() => {
        const fetchEvento = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/evento-ativo`, {
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
    }, [token]);

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
                body: JSON.stringify({ participanteId: selectedParticipant.id })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage(`Bem-vindo(a), ${selectedParticipant.nome.split(' ')[0]}!`);
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

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflow: 'hidden' }}>
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                        <h2 style={{ fontSize: '2.5rem', color: '#333', marginBottom: '3rem' }}>Seja Bem-vindo(a)!</h2>

                        {/* Círculo do Totem agora com estilo idêntico ao Access Panel */}
                        <div
                            className="totem-circle totem-circle-animated"
                            style={{
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                margin: '0 auto 3rem',
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

                        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '3rem', fontWeight: 'bold' }}>
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
                    <div style={{ width: '100%', maxWidth: '800px', animation: 'slideUp 0.3s' }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', maxHeight: '50vh', overflowY: 'auto' }}>
                                {searchResults.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectParticipant(p)}
                                        style={{
                                            backgroundColor: 'white', padding: '1.5rem', borderRadius: '10px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #eee',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{p.nome}</div>
                                        <div style={{ color: '#666' }}>CPF: {p.cpf || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            searchTerm.length > 2 && <p style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>Nenhum resultado encontrado.</p>
                        )}

                        <button
                            onClick={() => { setView('welcome'); setSearchTerm(''); setSearchResults([]); }}
                            style={{
                                position: 'absolute', bottom: '2rem', left: '2rem', padding: '1rem 2rem',
                                backgroundColor: '#ccc', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer'
                            }}
                        >
                            ⬅ Voltar
                        </button>
                    </div>
                )}

                {view === 'confirm' && selectedParticipant && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: '3rem', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👤</div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Confirmar Identidade</h2>
                        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>Você é esta pessoa?</p>

                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#198754', marginBottom: '0.5rem' }}>
                            {selectedParticipant.nome}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: '3rem' }}>
                            CPF: {selectedParticipant.cpf || 'Não informado'}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setView('search')}
                                style={{
                                    padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#f8d7da', color: '#842029',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer'
                                }}
                            >
                                Não sou eu
                            </button>
                            <button
                                onClick={handleConfirmCheckin}
                                style={{
                                    padding: '1rem 3rem', fontSize: '1.3rem', backgroundColor: '#198754', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                                    boxShadow: '0 4px 10px rgba(25,135,84,0.3)'
                                }}
                            >
                                ✅ Sim, Confirmar Entrada
                            </button>
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div style={{ textAlign: 'center', animation: 'popIn 0.5s' }}>
                        <div style={{ fontSize: '6rem', color: '#198754', marginBottom: '1rem' }}>✅</div>
                        <h2 style={{ fontSize: '2.5rem', color: '#198754', marginBottom: '1rem' }}>Entrada Confirmada!</h2>
                        <p style={{ fontSize: '1.5rem', color: '#333' }}>{statusMessage}</p>
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
