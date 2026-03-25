import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { useClock, useActiveEvent, useBiometricProgress } from '../hooks/useTotem';
import { TotemLayout } from '../components/totem/TotemLayout';
import { SearchView, SuccessView, ErrorView } from '../components/totem/TotemViews';
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
    
    // View State
    const [view, setView] = useState('welcome');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [glowColor, setGlowColor] = useState(null);

    // Refs
    const searchInputRef = useRef(null);
    const isVerifyingRef = useRef(false);
    const alertCooldownsRef = useRef(new Map());

    // Hooks
    const { horaAtual, formatDate, formatTime } = useClock();
    const { evento } = useActiveEvent(API_URL, token, uuid, setView);
    const progress = useBiometricProgress(selectedParticipant, view, () => {
        setSelectedParticipant(null);
        setGlowColor(null);
    });

    // Validar checkout habilitado
    useEffect(() => {
        if (evento && !evento.habilitar_checkout) {
            setStatusMessage("Checkout não habilitado para este evento.");
            setView('error');
        }
    }, [evento]);

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

    const handleBiometricAttempt = async (templateOrResult, w, h, identifiedId) => {
        if (view !== 'welcome' || selectedParticipant) return;

        if (identifiedId !== undefined) {
            if (isVerifyingRef.current) return;
            isVerifyingRef.current = true;

            if (identifiedId === null) {
                setGlowColor('#dc3545'); 
                setTimeout(() => setGlowColor(null), 3000);
                isVerifyingRef.current = false;
                return;
            }

            const now = Date.now();
            const key = String(identifiedId);
            const lastAlert = alertCooldownsRef.current.get(key) || 0;
            if (now - lastAlert < 2000) { 
                isVerifyingRef.current = false;
                return;
            }
            alertCooldownsRef.current.set(key, now);

             try {
                const res = await fetch(`${API_URL}/participantes/busca?q=${identifiedId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const parts = await res.json();
                const p = parts.find(x => String(x.id) === String(identifiedId));
                if (p) {
                    setSelectedParticipant(p);
                    setGlowColor('var(--support-dark-blue)'); 
                    setTimeout(() => setGlowColor(null), 5000); 
                }
            } catch (e) {
                console.error("Erro na busca pós-scan:", e);
            } finally {
                isVerifyingRef.current = false;
            }
        }
    };

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
                setGlowColor('var(--support-dark-blue)');
                setView('success');
            } else if (data.already_checked_out) {
                setStatusMessage("Saída já registrada anteriormente.");
                setGlowColor('#FFE596');
                setView('error');
            } else {
                setStatusMessage(data.msg || "Erro ao registrar saída.");
                setGlowColor('#dc3545');
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
        <TotemLayout title="Checkout" evento={evento} horaAtual={horaAtual} formatDate={formatDate} formatTime={formatTime} style={{'--topbar-bg': 'var(--support-dark-blue)'}}>
            {/* Override manual do color do topbar para Checkout */}
            <style>{`.totem-topbar { background-color: var(--support-dark-blue) !important; }`}</style>
            
            {view === 'welcome' && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', position: 'relative' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Já vai embora?</h2>

                    <div className="moving-border-wrapper moving-border-blue" style={{
                        width: 'min(462px, 62vh)',
                        height: 'min(462px, 62vh)',
                        borderRadius: '35px',
                        margin: '0 auto clamp(1.5rem, 4vh, 4rem)'
                    }}>
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '30px', overflow: 'hidden',
                            backgroundColor: '#ffffff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <FaceScanner
                                onScanSuccess={handleBiometricAttempt}
                                isRegistration={false}
                                token={token}
                                eventId={uuid}
                                glowColor={glowColor}
                            />
                        </div>
                    </div>

                    {selectedParticipant && (
                        <div style={{
                            position: 'absolute', bottom: '20px', left: '20px', right: '20px',
                            backgroundColor: 'white', borderRadius: '15px', padding: '1.2rem',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            zIndex: 100, border: '2px solid var(--support-dark-blue)'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--support-dark-blue)', transition: 'width 0.05s linear' }} />
                            </div>
                            <div style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', marginTop: '4px' }}>Identificado</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333', marginBottom: '0.2rem' }}>{selectedParticipant.nome}</div>
                            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>Deseja confirmar sua saída do evento agora?</div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <button onClick={() => setSelectedParticipant(null)} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f8f9fa', color: '#555', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                <button onClick={handleConfirmCheckout} disabled={isVerifyingRef.current} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', backgroundColor: 'var(--support-dark-blue)', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0, 84, 166, 0.3)' }}>
                                    {isVerifyingRef.current ? '...' : 'Sair do Evento'}
                                </button>
                            </div>
                        </div>
                    )}

                    <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
                        Aproxime seu rosto para realizar o checkout
                    </p>

                    <button
                        onClick={() => setView('search')}
                        style={{
                            padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: 'var(--support-dark-blue)', color: 'white',
                            border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 84, 166, 0.3)',
                            display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', transition: 'transform 0.2s', fontWeight: 'bold'
                        }}
                    >
                        <span style={{ fontSize: '1.5rem' }}>🔍</span>
                        Localizar meu Cadastro
                    </button>
                </div>
            )}

            {view === 'search' && (
                <SearchView 
                    setView={setView} 
                    searchTerm={searchTerm} 
                    handleSearch={handleSearch} 
                    searchResults={searchResults} 
                    handleSelectParticipant={handleSelectParticipant} 
                    maskCPF={maskCPF} 
                    searchInputRef={searchInputRef} 
                />
            )}

            {view === 'confirm' && selectedParticipant && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%', width: '100%', maxWidth: '600px' }}>
                    <div style={{ fontSize: 'clamp(2.5rem, 5vh, 4rem)', marginBottom: 'clamp(0.5rem, 1vh, 1rem)' }}>🏁</div>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 2rem)', marginBottom: '0.5rem' }}>Confirmar minha Saída</h2>
                    <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: 'clamp(1rem, 2vh, 2rem)' }}>Você deseja realizar o seu checkout?</p>
                    <div style={{ fontSize: 'clamp(1.4rem, 2.5vh, 1.8rem)', fontWeight: 'bold', color: 'var(--support-dark-blue)', marginBottom: '0.5rem' }}>{selectedParticipant.nome}</div>
                    <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: '0.5rem' }}>CPF: {maskCPF(selectedParticipant.cpf)}</div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 'auto' }}>
                        <button onClick={() => { setSelectedParticipant(null); setView('search'); }} style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#f8d7da', color: '#842029', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={handleConfirmCheckout} style={{ padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--support-dark-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0, 84, 166, 0.3)' }}>✅ Sair do Evento</button>
                    </div>
                </div>
            )}

            {view === 'success' && (
                <SuccessView 
                    scannedUser={selectedParticipant} 
                    statusMessage={statusMessage} 
                />
            )}
            
            {view === 'error' && <ErrorView statusMessage={statusMessage} />}
        </TotemLayout>
    );
}

export default TotemSaida;
