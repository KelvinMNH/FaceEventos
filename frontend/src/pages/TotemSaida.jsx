import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:3000/api';



function TotemSaida() {
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
    const [scannerStatus, setScannerStatus] = useState('disconnected'); // 'connected' | 'disconnected'
    const [qualityMsg, setQualityMsg] = useState(''); // Novo: feedback de qualidade


    const searchInputRef = useRef(null);
    const wsRef = useRef(null);

    // Atualizar hora
    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Buscar evento ativo
    useEffect(() => {
        const fetchEvento = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/evento-ativo`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data) {
                    setEvento(data);
                    if (!data.habilitar_checkout) {
                        setStatusMessage("Checkout não habilitado para este evento.");
                        setView('error');
                    }
                }
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

    // WebSocket Bridge Connect
    useEffect(() => {
        let ws = null;
        let reconnectTimer = null;

        const connect = () => {
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

            ws = new WebSocket('ws://localhost:4000');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Bridge conectada');
                setScannerStatus('connected');
                ws.send('START_CAPTURE');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'IMAGE_DATA') {
                        handleBiometricAttempt(data.image, data.width, data.height);
                    } else if (data.type === 'STATUS') {
                        console.log('Bridge Status:', data.message);
                        if (data.status === 'low_quality') {
                            setQualityMsg(data.message);
                            setTimeout(() => setQualityMsg(''), 3000);
                        }
                    } else if (data.type === 'DEVICE_STATUS') {
                        setScannerStatus(data.status);
                    }
                } catch (e) {
                    console.error('Erro ao processar mensagem', e);
                }
            };

            ws.onclose = () => {
                console.log('Bridge desconectada. Tentando reconectar...');
                setScannerStatus('disconnected');
                wsRef.current = null;
                reconnectTimer = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('Erro no WebSocket:', err);
                if (ws.readyState === WebSocket.OPEN) ws.close();
            };
        };

        connect();

        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, []);

    const handleBiometricAttempt = async (base64Image, width, height) => {
        // Só processa biometria se estiver na tela inicial ou busca
        if (view !== 'welcome' && view !== 'search') return;

        try {
            const res = await fetch(`${API_URL}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    template: base64Image,
                    width,
                    height,
                    device_id: 'checkout_totem_bio',
                    check_only: true // Flag importante para não registrar entrada
                })
            });
            const data = await res.json();

            if (data.autorizado && data.participante) {
                // Identificou! Vai para confirmação
                handleSelectParticipant(data.participante);
            } else {
                setStatusMessage("Biometria não reconhecida. Tente novamente.");
                setView('error');
            }
        } catch (e) {
            console.error("Erro na validação biométrica:", e);
        } finally {
            // Reiniciar captura após 2 segundos
            setTimeout(() => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send('START_CAPTURE');
                }
                setView(prev => prev === 'error' ? 'welcome' : prev);
            }, 2000);
        }
    };

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
            // Opcional: Filtrar apenas quem JÁ ENTROU? Por enquanto, busca geral.
            setSearchResults(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectParticipant = (p) => {
        setSelectedParticipant(p);
        setView('confirm');
    };

    const handleConfirmCheckout = async () => {
        if (!selectedParticipant) return;

        try {
            const res = await fetch(`${API_URL}/registrar-saida`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ participanteId: selectedParticipant.id })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage(`Até logo, ${selectedParticipant.nome}!`);
                setView('success');
            } else if (data.already_checked_out) {
                setStatusMessage("Saída já registrada anteriormente.");
                setView('error');
            } else {
                setStatusMessage(data.msg || "Erro ao registrar saída");
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

    // Simulação de Checkout Inteligente
    const simulateBiometricScan = async (success = true) => {
        if (view !== 'welcome') return;

        if (success) {
            try {
                // 1. Buscar todos os logs para identificar quem está "dentro" do evento
                const logsRes = await fetch(`${API_URL}/logs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const allLogs = await logsRes.json();

                if (!evento) return;

                // 2. Filtrar apenas logs do evento ativo
                const eventoLogs = allLogs.filter(l => l.EventoId === evento.id);

                // 3. Mapear o último estado de cada participante
                const statusMap = {};
                eventoLogs.forEach(log => {
                    if (log.ParticipanteId && !statusMap[log.ParticipanteId]) {
                        // Como os logs vêm ordenados por data decrescente (mais recente primeiro),
                        // o primeiro log que encontrarmos de cada participante é o estado atual dele.
                        statusMap[log.ParticipanteId] = log.tipo_acesso;
                    }
                });

                // 4. Pegar IDs de quem está com estado 'entrada' (ou seja, entrou e ainda não saiu)
                const inPids = Object.keys(statusMap).filter(pid => statusMap[pid] === 'entrada');

                if (inPids.length > 0) {
                    const randomPid = inPids[Math.floor(Math.random() * inPids.length)];

                    // Buscar dados do participante selecionado
                    const partRes = await fetch(`${API_URL}/participantes/busca?q=${randomPid}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const partsFound = await partRes.json();

                    if (partsFound && partsFound.length > 0) {
                        const p = partsFound.find(x => x.id === parseInt(randomPid)) || partsFound[0];
                        setSelectedParticipant(p);
                        handleConfirmCheckout();
                    }
                } else {
                    console.log("Nenhum participante com entrada pendente para simular checkout.");
                    setStatusMessage("Ninguém entrou ainda para simular saída.");
                    setView('error');
                    setTimeout(() => setView('welcome'), 3000);
                }
            } catch (e) {
                console.error("Erro na simulação de checkout:", e);
            }
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

    if (view === 'error' && statusMessage === "Checkout não habilitado para este evento.") {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8d7da', color: '#842029', flexDirection: 'column' }}>
                <h1>🚫 Checkout Desabilitado</h1>
                <p>Este evento não permite registro de saída.</p>
                <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Voltar</button>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Topbar */}
            <div style={{ backgroundColor: '#0d6efd', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>

                {/* Lado Esquerdo: Logo */}
                <div style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ height: '60px', borderRadius: '4px', backgroundColor: 'white', padding: '2px' }} />
                </div>

                {/* Centro: Título Centralizado */}
                <div style={{ flex: '2', textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>Totem de Checkout (Saída)</h1>
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
                    <div style={{
                        marginTop: '10px',
                        fontSize: '0.8rem',
                        color: scannerStatus === 'connected' ? '#198754' : '#dc3545',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px'
                    }}>
                        <span style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: scannerStatus === 'connected' ? '#198754' : '#dc3545',
                            display: 'inline-block'
                        }}></span>
                        {scannerStatus === 'connected' ? 'Leitor Online' : 'Leitor Offline'}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'min-content' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Já vai embora?</h2>

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
                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                '--accent-color': '#0d6efd'
                            }}
                        >
                            <span style={{ fontSize: 'clamp(4rem, 8vh, 6rem)', position: 'relative', zIndex: 2 }}>👆</span>
                        </div>

                        <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
                            {qualityMsg ? (
                                <span style={{ color: '#FF9800', animation: 'shake 0.5s infinite' }}>⚠️ {qualityMsg}</span>
                            ) : (
                                "Posicione seu dedo no leitor biométrico para fazer o checkout."
                            )}
                        </p>

                        <button
                            onClick={() => setView('search')}
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#0d6efd', color: 'white',
                                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(13,110,253,0.3)',
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
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{p.nome}</div>
                                        <div style={{ color: '#666', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span>CPF: {maskCPF(p.cpf)}</span>
                                            {p.crm && <span style={{ color: '#2c3e50', fontWeight: '500' }}>CRM: {p.crm}</span>}
                                            {p.especialidade && <span style={{ color: '#0d6efd', fontSize: '0.85rem', fontStyle: 'italic' }}>{p.especialidade}</span>}
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
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                        <div style={{ fontSize: 'clamp(2.5rem, 5vh, 4rem)', marginBottom: 'clamp(0.5rem, 1vh, 1rem)' }}>🏁</div>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 2rem)', marginBottom: '0.5rem' }}>Confirmar Saída</h2>
                        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: 'clamp(1rem, 2vh, 2rem)' }}>Você está realizando o checkout?</p>

                        <div style={{ fontSize: 'clamp(1.4rem, 2.5vh, 1.8rem)', fontWeight: 'bold', color: '#0d6efd', marginBottom: '0.5rem' }}>
                            {selectedParticipant.nome}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: '0.5rem' }}>
                            CPF: {maskCPF(selectedParticipant.cpf)}
                        </div>
                        <div style={{ fontSize: '1.1rem', color: '#666', marginBottom: 'clamp(1rem, 2vh, 2rem)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {selectedParticipant.crm && <span>CRM: <strong>{selectedParticipant.crm}</strong></span>}
                            {selectedParticipant.especialidade && <span style={{ color: '#0d6efd', fontStyle: 'italic' }}>{selectedParticipant.especialidade}</span>}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 'auto' }}>
                            <button
                                onClick={() => setView('search')}
                                style={{
                                    padding: 'clamp(0.8rem, 1.5vh, 1rem) clamp(1rem, 2vw, 2rem)', fontSize: '1.1rem', backgroundColor: '#f8d7da', color: '#842029',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
                                style={{
                                    padding: 'clamp(0.8rem, 1.5vh, 1rem) clamp(1rem, 2vw, 3rem)', fontSize: '1.3rem', backgroundColor: '#0d6efd', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                                    boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)'
                                }}
                            >
                                ✅ Confirmar Saída
                            </button>
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div style={{ textAlign: 'center', animation: 'popIn 0.5s' }}>
                        <div style={{ fontSize: '6rem', color: '#0d6efd', marginBottom: '1rem' }}>👋</div>
                        <h2 style={{ fontSize: '2.5rem', color: '#0d6efd', marginBottom: '1rem' }}>Saída Confirmada!</h2>
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
                        <p style={{ fontSize: '1.1rem', color: '#666', marginTop: '1rem' }}>Obrigado pela presença!</p>
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
                <button onClick={() => simulateBiometricScan(true)}>Simular Checkout</button>
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

export default TotemSaida;
