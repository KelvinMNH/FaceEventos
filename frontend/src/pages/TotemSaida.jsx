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

    const searchInputRef = useRef(null);

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
                setStatusMessage(`Até logo, ${selectedParticipant.nome.split(' ')[0]}!`);
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

    // Simulação de Biometria (Mantida para testes)
    const simulateBiometricScan = async (success = true) => {
        if (view !== 'welcome') return;

        if (success) {
            try {
                const res = await fetch(`${API_URL}/participantes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const parts = await res.json();
                if (parts && parts.length > 0) {
                    const p = parts[Math.floor(Math.random() * parts.length)];
                    setSelectedParticipant(p);
                    handleConfirmCheckout();
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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflow: 'hidden' }}>
            {/* Topbar - Diferenciada com cor laranja/avermelhada para Saída? Ou manter padrão verde? Vamos usar um tom azul/neutro ou o verde mesmo para consistência. Vou usar um Azul escuro para diferenciar. */}
            <div style={{ backgroundColor: '#0d6efd', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ height: '50px', borderRadius: '4px', backgroundColor: 'white', padding: '2px' }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Totem de Checkout (Saída)</h1>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{evento ? evento.nome : 'Carregando...'}</div>
                        {evento && (
                            <div style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                                <span>📅 Data: {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}</span>
                                <span>🕐 Hora: {evento.hora_inicio}</span>
                                <span>📍 Local: {evento.local}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '4.5rem', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: 1 }}>{formatTime(horaAtual)}</div>
                    <div style={{ fontSize: '1.6rem', marginTop: '5px' }}>{formatDate(horaAtual)}</div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                        <div style={{
                            width: '200px', height: '200px', borderRadius: '50%', backgroundColor: '#e7f5ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 3rem',
                            boxShadow: '0 10px 30px rgba(13, 110, 253, 0.2)', border: '4px solid #0d6efd'
                        }}>
                            <span style={{ fontSize: '6rem' }}>👋</span>
                        </div>
                        <h2 style={{ fontSize: '2.5rem', color: '#333', marginBottom: '1rem' }}>Já vai embora?</h2>
                        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '3rem' }}>
                            Coloque seu dedo no leitor biométrico para fazer o checkout.
                        </p>

                        <button
                            onClick={() => setView('search')}
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#0d6efd', color: 'white',
                                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)',
                                transition: 'transform 0.2s', fontWeight: 'bold'
                            }}
                        >
                            🔍 Buscar meu Cadastro
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
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏁</div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Confirmar Saída</h2>
                        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>Você está realizando o checkout?</p>

                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0d6efd', marginBottom: '0.5rem' }}>
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
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
                                style={{
                                    padding: '1rem 3rem', fontSize: '1.3rem', backgroundColor: '#0d6efd', color: 'white',
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
                        <div style={{ fontSize: '6rem', color: '#198754', marginBottom: '1rem' }}>✅</div>
                        <h2 style={{ fontSize: '2.5rem', color: '#198754', marginBottom: '1rem' }}>Saída Confirmada!</h2>
                        <p style={{ fontSize: '1.5rem', color: '#333' }}>{statusMessage}</p>
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
                <button onClick={() => simulateBiometricScan(true)}>Simular Checkout OK</button>
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
