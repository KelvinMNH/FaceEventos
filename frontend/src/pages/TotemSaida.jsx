import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { FaceScanner } from '../components/FaceScanner';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const FaceIcon = ({ size = "1em", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M9 11.75c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm6 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-2.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
    </svg>
);



function TotemSaida() {
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
    const [progress, setProgress] = useState(100);
    const [glowColor, setGlowColor] = useState(null);


    const searchInputRef = useRef(null);
    const isVerifyingRef = useRef(false);
    const alertCooldownsRef = useRef(new Map());

    // Atualizar hora
    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Buscar evento ativo
    useEffect(() => {
        const fetchEvento = async () => {
            if (!token || !uuid) return;
            try {
                const res = await fetch(`${API_URL}/eventos/${uuid}`, {
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
    }, [token, uuid]);

    // Focar no input e limpar busca quando entrar na tela de busca
    useEffect(() => {
        if (view === 'search') {
            setSearchTerm('');
            setSearchResults([]);
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 100);
        }
    }, [view]);

    // Efeito para o countdown de auto-cancelamento (5s)
    useEffect(() => {
        let timer;
        if (selectedParticipant && !isVerifyingRef.current && view === 'welcome') {
            setProgress(100);
            const startTime = Date.now();
            const duration = 5000;

            timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);

                if (elapsed >= duration) {
                    setSelectedParticipant(null);
                    setGlowColor(null);
                    clearInterval(timer);
                }
            }, 50);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [selectedParticipant, isVerifyingRef.current, view]);

    // WebSocket removido - Reconhecimento facial via câmera direta no navegador

    const handleBiometricAttempt = async (templateOrResult, w, h, identifiedId) => {
        // Bloqueia se já estiver processando ou se um card já estiver aberto
        if (view !== 'welcome' || selectedParticipant) return;

        if (identifiedId !== undefined) {
            if (isVerifyingRef.current) return;
            isVerifyingRef.current = true;

            if (identifiedId === null) {
                setGlowColor('#dc3545'); // Vermelho se detectou mas não reconheceu
                setTimeout(() => setGlowColor(null), 3000);
                isVerifyingRef.current = false;
                return;
            }

            // Cooldown para evitar spam de busca (reduzido de 15s para 2s no checkout)
            const now = Date.now();
            const key = String(identifiedId);
            const lastAlert = alertCooldownsRef.current.get(key) || 0;
            if (now - lastAlert < 2000) { 
                isVerifyingRef.current = false;
                return;
            }
            alertCooldownsRef.current.set(key, now);

            // Identificou! Busca os dados do participante
             try {
                const res = await fetch(`${API_URL}/participantes/busca?q=${identifiedId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const parts = await res.json();
                // Comparação segura de ID (string vs number)
                const p = parts.find(x => String(x.id) === String(identifiedId));
                if (p) {
                    setSelectedParticipant(p);
                    setGlowColor('#0d6efd'); // Azul para identificação de checkout
                    setTimeout(() => setGlowColor(null), 5000); // Limpa após 5s se não confirmar
                    // Não muda o view, deixa no 'welcome' para mostrar o card flutuante
                }
            } catch (e) {
                console.error("Erro na busca pós-scan:", e);
            } finally {
                isVerifyingRef.current = false;
            }
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
        setView('confirm'); // Volta para a tela de confirmação tradicional
    };

    const handleConfirmCheckout = async () => {
        if (!selectedParticipant || isVerifyingRef.current) return;
        isVerifyingRef.current = true;

        try {
            const res = await fetch(`${API_URL}/registrar-saida`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    participanteId: parseInt(selectedParticipant.id),
                    eventoId: uuid
                })
            });
            const data = await res.json();

            if (data.success) {
                setStatusMessage(`Até logo, ${selectedParticipant.nome}!`);
                setGlowColor('#0d6efd'); // Azul para saída
                setView('success');
            } else if (data.already_checked_out) {
                setStatusMessage("Saída já registrada anteriormente.");
                setGlowColor('#ffc107'); // Amarelo para "já saiu" (alerta)
                setView('error');
            } else {
                setStatusMessage(data.msg || "Erro ao registrar saída.");
                setGlowColor('#dc3545'); // Vermelho para erro
                setView('error');
            }
        } catch (e) {
            console.error(e);
            setStatusMessage("Erro de conexão.");
            setView('error');
        } finally {
            isVerifyingRef.current = false;
        }

        setTimeout(() => {
            setView('welcome');
            setStatusMessage('');
            setSelectedParticipant(null);
            setGlowColor(null);
        }, 3000);
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
                const eventoLogs = allLogs.filter(l => l.Evento && l.Evento.uuid === uuid);

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
                    {/* Status do leitor removido (câmera integrada) */}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'min-content' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', position: 'relative' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Realizar Checkout</h2>

                        {/* Círculo do Totem com Câmera Sempre Ativa */}
                        <div
                            style={{
                                width: 'min(450px, 60vh)',
                                height: 'min(450px, 60vh)',
                                borderRadius: '30px',
                                overflow: 'hidden',
                                backgroundColor: '#ffffff',
                                margin: '0 auto clamp(1rem, 3vh, 3rem)',
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                border: '1px solid #eee'
                            }}
                        >
                            <FaceScanner
                                onScanSuccess={handleBiometricAttempt}
                                isRegistration={false}
                                token={token}
                                eventId={uuid}
                                glowColor={glowColor}
                            />

                            {/* Card de Confirmação Flutuante (Overlay) */}
                            {selectedParticipant && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '20px',
                                    right: '20px',
                                    backgroundColor: 'white',
                                    borderRadius: '15px',
                                    padding: '1.2rem',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                    animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    zIndex: 100,
                                    border: '2px solid #0d6efd'
                                }}>
                                    {/* Barra de Progresso */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
                                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#0d6efd', transition: 'width 0.05s linear' }} />
                                    </div>

                                    <div style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', marginTop: '4px' }}>Identificado</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333', marginBottom: '0.2rem' }}>{selectedParticipant.nome}</div>
                                    <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>Deseja confirmar sua saída do evento agora?</div>
                                    
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button 
                                            onClick={() => setSelectedParticipant(null)}
                                            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f8f9fa', color: '#555', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleConfirmCheckout}
                                            disabled={isVerifyingRef.current}
                                            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', backgroundColor: '#0d6efd', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(13, 110, 253, 0.3)' }}
                                        >
                                            {isVerifyingRef.current ? '...' : 'Sair do Evento'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
                            Aproxime seu rosto para realizar o checkout
                        </p>

                        <button
                            onClick={() => setView('search')}
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#0d6efd', color: 'white',
                                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)',
                                display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto'
                            }}
                        >
                            <span style={{ fontSize: '1.5rem' }}>🔍</span>
                            Localizar meu Cadastro
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
                                         <div style={{ flex: 1 }}>
                                             <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{p.nome}</div>
                                             <div style={{ color: '#666', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                 <span>CPF: {maskCPF(p.cpf)}</span>
                                                 {p.crm && <span style={{ color: '#2c3e50', fontWeight: '500' }}>CRM: {p.crm}</span>}
                                                 {p.especialidade && <span style={{ color: '#0d6efd', fontSize: '0.85rem', fontStyle: 'italic' }}>{p.especialidade}</span>}
                                             </div>
                                         </div>
                                         <div style={{ display: 'flex', alignItems: 'center' }}>
                                             {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                                                 <span title="Face Cadastrada" style={{ color: '#0d6efd', display: 'flex' }}><FaceIcon size="2rem" /></span>
                                             ) : (
                                                 <span title="Sem Biometria" style={{ color: '#666', opacity: 0.3, filter: 'grayscale(100%)', display: 'flex' }}><FaceIcon size="2rem" /></span>
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
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
                        <div style={{ fontSize: 'clamp(2.5rem, 5vh, 4rem)', marginBottom: 'clamp(0.5rem, 1vh, 1rem)' }}>🏁</div>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 2rem)', marginBottom: '0.5rem' }}>Confirmar minha Saída</h2>
                        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: 'clamp(1rem, 2vh, 2rem)' }}>Você deseja realizar o seu checkout?</p>

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
                                onClick={() => {
                                    setSelectedParticipant(null);
                                    setView('search');
                                }}
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
                                ✅ Sair do Evento
                            </button>
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div style={{ 
                        textAlign: 'center', 
                        animation: 'popIn 0.5s',
                        width: '100%',
                        maxWidth: '800px',
                        padding: '3rem 2rem',
                        borderRadius: '30px',
                        backgroundColor: 'rgba(25, 135, 84, 0.5)', 
                        color: 'white',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        border: '4px solid white',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{
                            width: '240px',
                            height: '240px',
                            margin: '0 auto 1.5rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: '8px solid white',
                            overflow: 'hidden'
                        }}>
                            {selectedParticipant?.foto_biometria ? (
                                <img 
                                    src={selectedParticipant.foto_biometria} 
                                    alt="Foto" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <div style={{ fontSize: '8rem' }}>👋</div>
                            )}
                        </div>

                        <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                            {selectedParticipant?.genero === 'F' ? 'Até logo, Dra.' : (selectedParticipant?.genero === 'M' ? 'Até logo, Dr.' : 'Até logo,')},
                        </h2>
                        
                        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', lineHeight: '1.2' }}>
                            {selectedParticipant?.nome || 'Participante'}
                        </h1>

                        {selectedParticipant?.crm && (
                            <div style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>
                                CRM: {selectedParticipant.crm}
                            </div>
                        )}

                        <div style={{ 
                            fontSize: '1.8rem', 
                            fontWeight: '600', 
                            backgroundColor: 'rgba(0,0,0,0.2)', 
                            padding: '1rem 2rem', 
                            borderRadius: '50px',
                            display: 'inline-block'
                        }}>
                            Obrigado pela presença!
                        </div>
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
