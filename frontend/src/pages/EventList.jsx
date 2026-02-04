import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function EventList() {
    const navigate = useNavigate();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEventos();
    }, []);

    const fetchEventos = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/eventos');
            const data = await res.json();
            setEventos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEvent = async (id) => {
        try {
            const res = await fetch(`http://localhost:3000/api/eventos/${id}/ativar`, { method: 'POST' });
            if (res.ok) {
                navigate('/access');
            }
        } catch (err) {
            alert("Erro ao selecionar evento");
        }
    };

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Eventos Disponíveis</h1>
                    <button
                        onClick={() => navigate('/create')}
                        style={{
                            padding: '0.8rem 2rem', // Padding aumentado
                            backgroundColor: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(46, 164, 79, 0.2)',
                            transition: 'transform 0.1s'
                        }}
                    >
                        + Novo Evento
                    </button>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {eventos.filter(e => e.status !== 'finalizado').length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Nenhum evento disponível no momento.</p>
                            ) : (
                                eventos.filter(e => e.status !== 'finalizado').map(evento => (
                                    <div key={evento.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        {evento.imagem && (
                                            <div style={{ height: '140px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                                <img src={evento.imagem} alt={evento.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.8rem' }}>
                                                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{evento.nome}</h2>
                                                {evento.status === 'ativo' && <span className="badge badge-success" style={{ flexShrink: 0 }}>ATIVO</span>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                <div><strong>Data:</strong> {new Date(evento.data_inicio).toLocaleDateString()}</div>
                                                <div><strong>Horário:</strong> {evento.hora_inicio || '--:--'}</div>
                                                <div><strong>Local:</strong> {evento.local || 'Não definido'}</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSelectEvent(evento.id)}
                                            style={{
                                                padding: '0.75rem',
                                                backgroundColor: evento.status === 'ativo' ? 'var(--success-color)' : 'white',
                                                color: evento.status === 'ativo' ? 'white' : 'var(--accent-color)',
                                                border: `1px solid ${evento.status === 'ativo' ? 'transparent' : 'var(--border-color)'}`,
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                marginTop: 'auto',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {evento.status === 'ativo' ? 'Acessar Painel' : 'Selecionar Evento'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {eventos.filter(e => e.status === 'finalizado').length > 0 && (
                            <>
                                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '3rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                    Histórico de Eventos
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', opacity: 0.8 }}>
                                    {eventos.filter(e => e.status === 'finalizado').map(evento => (
                                        <div key={evento.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.8rem' }}>
                                                    <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: 0 }}>{evento.nome}</h2>
                                                    <span className="badge badge-neutral" style={{ flexShrink: 0 }}>FINALIZADO</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    <div><strong>Data:</strong> {new Date(evento.data_inicio).toLocaleDateString()}</div>
                                                    <div><strong>Horário:</strong> {evento.hora_inicio || '--:--'}</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigate(`/event/${evento.id}/report`)}
                                                style={{
                                                    padding: '0.6rem',
                                                    backgroundColor: '#f6f8fa',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    marginTop: 'auto'
                                                }}
                                            >
                                                Ver Detalhes
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

export default EventList;
