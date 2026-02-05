import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

function TotemAcesso() {
    const navigate = useNavigate();
    const [evento, setEvento] = useState(null);
    const [status, setStatus] = useState('aguardando'); // aguardando, processando, sucesso, erro
    const [participante, setParticipante] = useState(null);
    const [mensagem, setMensagem] = useState('');
    const [horaAtual, setHoraAtual] = useState(new Date());

    // Atualizar hora a cada segundo
    useEffect(() => {
        const interval = setInterval(() => {
            setHoraAtual(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Buscar evento ativo
    useEffect(() => {
        const fetchEvento = async () => {
            try {
                const res = await fetch(`${API_URL}/evento-ativo`);
                const data = await res.json();
                if (data) {
                    setEvento(data);
                } else {
                    setMensagem('Nenhum evento ativo no momento');
                    setStatus('erro');
                }
            } catch (e) {
                console.error(e);
                setMensagem('Erro ao conectar com o servidor');
                setStatus('erro');
            }
        };
        fetchEvento();
    }, []);

    // Simular leitura de biometria
    const handleBiometriaLeitura = async (simularSucesso = true) => {
        console.log('🔍 Iniciando simulação. Sucesso?', simularSucesso);
        setStatus('processando');
        setMensagem('Processando biometria...');

        setTimeout(async () => {
            try {
                if (simularSucesso) {
                    console.log('✅ Tentando simular SUCESSO...');
                    const res = await fetch(`${API_URL}/participantes`);
                    console.log('📡 Resposta da API:', res.status);

                    const participantes = await res.json();
                    console.log('👥 Participantes encontrados:', participantes.length);

                    if (participantes && participantes.length > 0) {
                        const participantesAtivos = participantes.filter(p => p.ativo !== false);
                        console.log('👥 Participantes ativos:', participantesAtivos.length);

                        if (participantesAtivos.length > 0) {
                            const participanteAleatorio = participantesAtivos[Math.floor(Math.random() * participantesAtivos.length)];
                            console.log('🎯 Participante selecionado:', participanteAleatorio.nome);

                            setStatus('sucesso');
                            setParticipante(participanteAleatorio);
                            setMensagem(`Bem-vindo(a), Dr(a). ${participanteAleatorio.nome}!`);

                            try {
                                const resAcesso = await fetch(`${API_URL}/registrar-acesso-id`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ participanteId: participanteAleatorio.id })
                                });
                                console.log('📝 Acesso registrado:', resAcesso.status);
                            } catch (err) {
                                console.error('❌ Erro ao registrar acesso:', err);
                            }

                            setTimeout(() => {
                                setStatus('aguardando');
                                setParticipante(null);
                                setMensagem('');
                            }, 3000);
                        } else {
                            console.warn('⚠️ Nenhum participante ativo');
                            setStatus('erro');
                            setMensagem('Nenhum participante ativo cadastrado');
                            setTimeout(() => {
                                setStatus('aguardando');
                                setMensagem('');
                            }, 3000);
                        }
                    } else {
                        console.warn('⚠️ Nenhum participante no banco');
                        setStatus('erro');
                        setMensagem('Nenhum participante cadastrado');
                        setTimeout(() => {
                            setStatus('aguardando');
                            setMensagem('');
                        }, 3000);
                    }
                } else {
                    console.log('❌ Simulando FALHA...');
                    setStatus('erro');
                    setMensagem('Biometria não reconhecida. Tente novamente.');

                    setTimeout(() => {
                        setStatus('aguardando');
                        setMensagem('');
                    }, 3000);
                }
            } catch (e) {
                console.error('💥 Erro na simulação:', e);
                setStatus('erro');
                setMensagem('Erro ao processar biometria: ' + e.message);

                setTimeout(() => {
                    setStatus('aguardando');
                    setMensagem('');
                }, 3000);
            }
        }, 1500);
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #198754 0%, #20c997 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative'
        }}>
            {/* Botão Admin (pequeno, no canto) */}
            <button
                onClick={() => navigate('/')}
                style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    opacity: 0.6,
                    transition: 'opacity 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.6'}
            >
                ⚙️ Admin
            </button>

            {/* Header com data e hora - AUMENTADO */}
            <div style={{
                position: 'absolute',
                top: '2rem',
                left: '2rem',
                color: 'white',
                textAlign: 'left'
            }}>
                <div style={{ fontSize: '1.5rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                    {formatDate(horaAtual)}
                </div>
                <div style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: 1 }}>
                    {formatTime(horaAtual)}
                </div>
            </div>

            {/* Container Principal - LAYOUT DUAS COLUNAS */}
            <div style={{
                display: 'flex',
                gap: '3rem',
                maxWidth: '1400px',
                width: '100%',
                alignItems: 'stretch'
            }}>
                {/* COLUNA ESQUERDA - Dados do Evento */}
                {evento && (
                    <div style={{
                        flex: '1',
                        background: 'white',
                        borderRadius: '20px',
                        padding: '3rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem'
                    }}>
                        {/* Imagem do Evento */}
                        {evento.imagem && (
                            <div style={{
                                width: '100%',
                                height: '300px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src={evento.imagem}
                                    alt={evento.nome}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        )}

                        {/* Nome do Evento */}
                        <h1 style={{
                            fontSize: '2.5rem',
                            color: '#198754',
                            margin: 0,
                            fontWeight: 'bold',
                            lineHeight: 1.2
                        }}>
                            {evento.nome}
                        </h1>

                        {/* Informações do Evento */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            fontSize: '1.3rem',
                            color: '#333'
                        }}>
                            {/* Data */}
                            {evento.data_inicio && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>📅</span>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Data</div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {new Date(evento.data_inicio).toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hora */}
                            {evento.hora_inicio && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>🕐</span>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Horário</div>
                                        <div style={{ fontWeight: 'bold' }}>{evento.hora_inicio}</div>
                                    </div>
                                </div>
                            )}

                            {/* Local */}
                            {evento.local && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '2rem' }}>📍</span>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Local</div>
                                        <div style={{ fontWeight: 'bold' }}>{evento.local}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* COLUNA DIREITA - Validação Biométrica */}
                <div style={{
                    flex: '1',
                    background: 'white',
                    borderRadius: '20px',
                    padding: '3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '2rem'
                    }}>
                        <h2 style={{
                            fontSize: '1.8rem',
                            color: '#198754',
                            marginBottom: '0.5rem',
                            fontWeight: 'bold'
                        }}>
                            Check-in
                        </h2>
                        <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>
                            Sistema de Acesso por Biometria
                        </p>
                    </div>

                    {/* Área de Status */}
                    <div style={{
                        minHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2rem'
                    }}>
                        {status === 'aguardando' && (
                            <>
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #002147 0%, #004080 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    <span style={{ fontSize: '4rem' }}>👆</span>
                                </div>
                                <h2 style={{ fontSize: '1.8rem', color: '#333', marginBottom: '1rem' }}>
                                    Bem-vindo(a)!
                                </h2>
                                <p style={{ fontSize: '1.2rem', color: '#198754', fontWeight: '600', marginBottom: '1rem' }}>
                                    É um prazer tê-lo(a) conosco!
                                </p>
                                <p style={{ color: '#666', fontSize: '1.1rem' }}>
                                    Posicione seu dedo no leitor para registrar sua entrada
                                </p>
                            </>
                        )}

                        {status === 'processando' && (
                            <>
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    background: '#ff6600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem',
                                    animation: 'spin 1s linear infinite'
                                }}>
                                    <span style={{ fontSize: '4rem', color: 'white' }}>⏳</span>
                                </div>
                                <h2 style={{ fontSize: '1.8rem', color: '#333' }}>
                                    {mensagem}
                                </h2>
                            </>
                        )}

                        {status === 'sucesso' && participante && (
                            <>
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    background: '#198754',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem',
                                    animation: 'scaleIn 0.3s ease-out'
                                }}>
                                    <span style={{ fontSize: '4rem', color: 'white' }}>✓</span>
                                </div>
                                <h2 style={{ fontSize: '2rem', color: '#198754', marginBottom: '1rem', fontWeight: 'bold' }}>
                                    Acesso Autorizado!
                                </h2>
                                <p style={{ fontSize: '1.5rem', color: '#333', marginBottom: '0.5rem' }}>
                                    Dr(a). {participante.nome}
                                </p>
                                {participante.crm && (
                                    <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '1rem' }}>
                                        CRM: {participante.crm}
                                    </p>
                                )}
                                <p style={{ fontSize: '1.1rem', color: '#198754', fontWeight: '600' }}>
                                    Aproveite o evento!
                                </p>
                            </>
                        )}

                        {status === 'erro' && (
                            <>
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    background: '#cf222e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem',
                                    animation: 'shake 0.5s'
                                }}>
                                    <span style={{ fontSize: '4rem', color: 'white' }}>✕</span>
                                </div>
                                <h2 style={{ fontSize: '1.8rem', color: '#cf222e', marginBottom: '1rem' }}>
                                    Acesso Negado
                                </h2>
                                <p style={{ fontSize: '1.1rem', color: '#666' }}>
                                    {mensagem || 'Biometria não reconhecida'}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Botões de Teste (remover em produção) */}
                    {status === 'aguardando' && (
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => handleBiometriaLeitura(true)}
                                style={{
                                    background: 'linear-gradient(135deg, #198754 0%, #20c997 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    borderRadius: '50px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(25,135,84,0.3)',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(25,135,84,0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 15px rgba(25,135,84,0.3)';
                                }}
                            >
                                ✓ Simular Sucesso
                            </button>

                            <button
                                onClick={() => handleBiometriaLeitura(false)}
                                style={{
                                    background: 'linear-gradient(135deg, #cf222e 0%, #ff4444 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    borderRadius: '50px',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(207,34,46,0.3)',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(207,34,46,0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 15px rgba(207,34,46,0.3)';
                                }}
                            >
                                ✕ Simular Falha
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Rodapé */}
            <div style={{
                position: 'absolute',
                bottom: '2rem',
                color: 'white',
                opacity: 0.7,
                fontSize: '0.9rem'
            }}>
                Em caso de problemas, procure a recepção
            </div>

            {/* Animações CSS */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
        </div>
    );
}

export default TotemAcesso;
