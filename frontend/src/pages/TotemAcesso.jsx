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
    const [scannedUser, setScannedUser] = useState(null); // Para exibir a foto no sucesso
    const [progress, setProgress] = useState(100);
    const [biometricResult, setBiometricResult] = useState(null); // { user, type: 'success' | 'already_in' | 'error', message? }
    const [balloonData, setBalloonData] = useState(null); // { name: string }
    const [glowColor, setGlowColor] = useState(null);

    // Wizard Registration States
    const [captureStep, setCaptureStep] = useState(1);
    const [capturedTemplates, setCapturedTemplates] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Refs to avoid stale closures in WS handlers
    const stepRef = useRef(1);
    const templatesRef = useRef([]);
    const isVerifyingRef = useRef(false);
    const alertCooldownsRef = useRef(new Map());

    // Sync refs with state
    useEffect(() => {
        stepRef.current = captureStep;
        templatesRef.current = capturedTemplates;
    }, [captureStep, capturedTemplates]);


    const searchInputRef = useRef(null);


    // Atualizar hora
    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Efeito para o countdown do card flutuante (Biometria)
    useEffect(() => {
        let timer;
        if (biometricResult && view === 'welcome') {
            setProgress(100);
            const startTime = Date.now();
            const duration = 5000;
            timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);
                if (elapsed >= duration) {
                    setBiometricResult(null);
                    setBalloonData(null);
                    setGlowColor(null);
                    clearInterval(timer);
                }
            }, 50);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [biometricResult, view, balloonData]);

    const handleBiometricScan = async (template, width, height, identifiedId, photo) => {
        if (isVerifyingRef.current) return;

        try {
            // Fluxo de Cadastro/Renovação (Wizard Simplificado)
            if (view === 'confirm' && selectedParticipant && template) {
                isVerifyingRef.current = true;
                setIsVerifying(true);
                
                try {
                    const res = await fetch(`${API_URL}/renovar-biometria`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            participanteId: selectedParticipant.id,
                            template: template,
                            foto: photo,
                            eventoId: uuid
                        })
                    });
                    const finalData = await res.json();
                    handleFinalResponse(finalData);
                } catch (err) {
                    console.error('Erro na renovação facial:', err);
                    setErrorMsg('Erro ao salvar biometria facial.');
                } finally {
                    isVerifyingRef.current = false;
                    setIsVerifying(false);
                }
                return;
            }

            // Fluxo de Identificação (Scan) - Processa mesmo se identifiedId for null (erro de reconhecimento)
            if (identifiedId !== undefined) {
                isVerifyingRef.current = true;
                setIsVerifying(true);
                try {
                    const res = await fetch(`${API_URL}/scan`, { 
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            identified_id: identifiedId,
                            eventId: uuid
                        })
                    });
                    const finalData = await res.json();
                    handleFinalResponse(finalData);
                } finally {
                    isVerifyingRef.current = false;
                    setIsVerifying(false);
                }
            }

        } catch (error) {
            console.error("Erro no processamento facial:", error);
            setStatusMessage("Erro de comunicação com o servidor.");
            setView('error');
            setTimeout(() => setView('welcome'), 3000);
        }
    };

    const handleFinalResponse = (finalData) => {
        const p = finalData.participante || finalData.Acompanhante || {};
        const msg = (finalData.mensagem || "").toLowerCase();
        const isAlreadyIn = finalData.already_in || 
                           msg.includes('ja validado') || 
                           msg.includes('ja identificado') || 
                           msg.includes('ja realizado') || 
                           msg.includes('ja registrado');

        // 1. Cooldown para "Já Identificado" (Evita repetição excessiva se o rosto continuar no sensor)
        // NOTA: Agora ativamos o cooldown também em caso de SUCESSO, para evitar que um alerta "Já Identificado"
        // apareça logo em seguida enquanto a pessoa ainda está na frente do sensor.
        const isSuccess = finalData.autorizado || finalData.success;
        if ((isAlreadyIn || isSuccess) && p.id) {
            const now = Date.now();
            const key = String(p.id);
            const lastAlert = alertCooldownsRef.current.get(key) || 0;
            
            // Se for um alerta tentando aparecer em cima de um alerta ou sucesso recente (< 15s)
            if (isAlreadyIn && (now - lastAlert < 15000)) { 
                return; // Silencia o alerta
            }
            
            // Atualiza o timestamp para futuras supressões de alerta
            alertCooldownsRef.current.set(key, now);
        }

        // 2. Se já estivermos mostrando um SUCESSO na tela para a mesma pessoa, ignore alertas redundantes
        if (biometricResult && biometricResult.type === 'success' && biometricResult.user) {
            if (String(biometricResult.user.id) === String(p.id) && isAlreadyIn) {
                return; 
            }
        }

        if (view === 'welcome') {
            if (isAlreadyIn) {
                const p = finalData.participante || { nome: "Participante" };
                setBalloonData({ name: p.nome });
                setBiometricResult({ user: p, type: 'already_in' }); // Mantemos no estado mas ocultamos o card no render
                setGlowColor('#FFE596'); // Amarelo Unimed (Aviso)
                setTimeout(() => setGlowColor(null), 5000);
                return;
            }
            if (finalData.autorizado || finalData.success) {
                setBiometricResult({ user: finalData.participante || { nome: "Participante" }, type: 'success' });
                setGlowColor('#00995D'); // Verde Unimed (Sucesso)
                setTimeout(() => setGlowColor(null), 5000);
                return;
            }

            // Se chegou aqui no welcome e não reconheceu
            setGlowColor('#dc3545'); // Vermelho (Erro)
            setTimeout(() => setGlowColor(null), 3000);
            setBiometricResult({ 
                user: { nome: "Visitante" }, 
                type: 'error', 
                message: "Rosto não reconhecido, tente novamente ou localize seu cadastro abaixo"
            });
            return;
        }

        if (finalData.autorizado || finalData.success) {
            const nome = finalData.participante ? finalData.participante.nome : "Participante";
            setScannedUser(finalData.participante);
            setStatusMessage(`Bem-vindo(a), ${nome}!`);
            setView('success');
            setTimeout(() => {
                setView('welcome');
                setSelectedParticipant(null);
                setCapturedTemplates([]);
                setCaptureStep(1);
                setScannedImage(null);
                setScannedUser(null);
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
            <div style={{ 
                backgroundColor: '#00995D', 
                color: 'white', 
                padding: '1rem 2.5rem', 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                alignItems: 'center', 
                boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
                zIndex: 10
            }}>
                {/* Lado Esquerdo: Marca e Evento */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
                    <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{evento ? evento.nome : 'Carregando...'}</div>
                        {evento && (
                            <div style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', gap: '1rem', marginTop: '4px' }}>
                                <span>📅 {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}</span>
                                <span>📍 {evento.local}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Centro: Título do Totem (Centralização Absoluta via Grid) */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Check-in
                    </h1>
                </div>

                {/* Lado Direito: Relógio */}
                <div style={{ textAlign: 'right', lineHeight: '1' }}>
                    <div style={{ fontSize: '5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatTime(horaAtual)}</div>
                    <div style={{ fontSize: '1.5rem', marginTop: '2px', opacity: 0.9 }}>{formatDate(horaAtual)}</div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'min-content' }}>

                {view === 'welcome' && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', position: 'relative' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', color: '#333', marginBottom: 'clamp(1rem, 3vh, 3rem)' }}>Seja Bem-vindo(a)!</h2>

                        {/* Círculo do Totem com Borda em Movimento */}
                        <div className="moving-border-wrapper moving-border-green" style={{
                            width: 'min(462px, 62vh)',
                            height: 'min(462px, 62vh)',
                            borderRadius: '35px',
                            margin: '0 auto clamp(1.5rem, 4vh, 4rem)'
                        }}>
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '30px',
                                    overflow: 'hidden',
                                    backgroundColor: '#ffffff',
                                    position: 'relative',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <FaceScanner
                                    onScanSuccess={handleBiometricScan}
                                    isRegistration={false}
                                    token={token}
                                    eventId={uuid}
                                    followerBalloon={balloonData}
                                    glowColor={glowColor}
                                />
                            </div>
                        </div>

                        {/* Card Flutuante Biométrico (Sucesso ou Erro - Já Identificado usa BALÃO) */}
                        {biometricResult && biometricResult.type !== 'already_in' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '85%',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                padding: '1.2rem',
                                borderRadius: '15px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                textAlign: 'center',
                                animation: 'slideUp 0.3s ease-out',
                                zIndex: 100,
                                border: '2px solid #00995D',
                                backdropFilter: 'blur(5px)'
                            }}>
                                {/* Barra de Progresso */}
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00995D', transition: 'width 0.05s linear' }} />
                                </div>

                                <div style={{ color: biometricResult.type === 'error' ? '#dc3545' : '#00995D', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                                    {biometricResult.type === 'success' ? 'Sucesso' : (biometricResult.type === 'error' ? 'Aviso' : 'Informativo')}
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                                    {biometricResult.type === 'error' ? 'Não Identificado' : biometricResult.user.nome}
                                </div>
                                <div style={{ color: biometricResult.type === 'error' ? '#dc3545' : '#00995D', fontSize: '1rem', marginTop: '0.2rem', fontWeight: '500' }}>
                                    {biometricResult.type === 'success' ? 'Entrada Confirmada! ✅' : 
                                     (biometricResult.type === 'error' ? (biometricResult.message || 'Rosto não reconhecido') : (biometricResult.user.nome + ' já registrado! ✅'))}
                                </div>
                            </div>
                        )}

                        <p style={{ fontSize: 'clamp(1rem, 2.5vh, 1.2rem)', color: '#666', marginBottom: 'clamp(1rem, 4vh, 3rem)', fontWeight: 'bold' }}>
                            Aproxime seu rosto da câmera para entrar
                        </p>

                        <button
                            onClick={() => setView('search')}
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.3rem', backgroundColor: '#00995D', color: 'white',
                                border: 'none', borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,153,93,0.3)',
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
                                backgroundColor: 'var(--basic-gray-100)',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '1.4rem',
                                cursor: 'pointer',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--basic-gray-700)',
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
                                                {p.especialidade && <span style={{ color: '#004E4C', fontSize: '0.85rem', fontStyle: 'italic' }}>{p.especialidade}</span>}
                                            </div>
                                        </div>
                                         <div style={{ display: 'flex', alignItems: 'center' }}>
                                             {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                                                 <span title="Face Cadastrada" style={{ color: '#00995D', display: 'flex' }}><FaceIcon size="2rem" /></span>
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
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s', backgroundColor: 'white', padding: 'clamp(1.5rem, 4vh, 3rem)', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '100%', width: '100%', maxWidth: '700px' }}>
                        <div style={{ fontSize: 'clamp(2rem, 4vh, 3rem)', marginBottom: '0.5rem' }}>👤</div>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vh, 1.8rem)', marginBottom: '0.5rem' }}>Confirmar Identidade</h2>
                        
                        <div style={{ fontSize: 'clamp(1.4rem, 2.5vh, 1.8rem)', fontWeight: 'bold', color: '#00995D', marginBottom: '0.5rem' }}>
                            {selectedParticipant.nome}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#555', marginBottom: 'clamp(1rem, 2vh, 1.5rem)' }}>
                            CPF: {maskCPF(selectedParticipant.cpf)}
                        </div>

                        {/* Face Capture UI */}
                        <div style={{ 
                            padding: '1rem', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '16px', 
                            border: '1px solid var(--basic-gray-100)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <div style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #00995D' }}>
                                <FaceScanner
                                    onScanSuccess={handleBiometricScan}
                                    isRegistration={true}
                                    token={token}
                                />
                            </div>
                            
                            <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '1rem', fontWeight: 'bold' }}>
                                {isVerifying ? 'Salvando...' : 'Aproxime o rosto e clique no botão circular'}
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
                                    padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: '#e9ecef', color: 'var(--basic-gray-700)',
                                    border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConfirmCheckin()}
                                style={{
                                    padding: '1rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--basic-gray-500)', color: 'white',
                                    border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500'
                                }}
                            >
                                Pular Biometria
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
                        backgroundColor: 'rgba(0, 153, 93, 0.5)', 
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
                            {scannedUser?.foto_biometria ? (
                                <img 
                                    src={scannedUser.foto_biometria} 
                                    alt="Foto" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <div style={{ fontSize: '8rem' }}>✅</div>
                            )}
                        </div>

                        <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                            {scannedUser?.genero === 'F' ? 'Bem-vinda' : (scannedUser?.genero === 'M' ? 'Bem-vindo' : 'Bem-vindo(a)')},
                        </h2>
                        
                        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', lineHeight: '1.2' }}>
                            {scannedUser?.nome || 'Participante'}
                        </h1>

                        {scannedUser?.crm && (
                            <div style={{ fontSize: '1.8rem', marginBottom: '1.5rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>
                                CRM: {scannedUser.crm}
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
                            Tenha um bom evento!
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
