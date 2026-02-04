import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';

function EventList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        data: '',
        hora: '',
        local: '',
        imagem: '',
        permitir_acompanhantes: false,
        max_acompanhantes: 0
    });
    const [creating, setCreating] = useState(false);
    const [messageModal, setMessageModal] = useState({ open: false, title: '', message: '', type: 'info' });

    const showMessage = (title, message, type = 'info') => {
        setMessageModal({ open: true, title, message, type });
    };

    const closeMessage = () => setMessageModal({ ...messageModal, open: false });

    useEffect(() => {
        fetchEventos();
        if (location.state?.openModal) {
            setIsModalOpen(true);
            // clean state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

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
            showMessage("Erro", "Erro ao selecionar evento", "error");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imagem: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);

        try {
            const res = await fetch('http://localhost:3000/api/eventos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setIsModalOpen(false);
                setFormData({ nome: '', data: '', hora: '', local: '', imagem: '', permitir_acompanhantes: false, max_acompanhantes: 0 });
                fetchEventos();
                navigate('/access'); // Opcional: já ir para o painel ou ficar na lista? Mantendo comportamento original de ir pro painel.
            } else {
                showMessage("Erro", "Erro ao criar evento", "error");
            }
        } catch (err) {
            console.error(err);
            showMessage("Erro", "Erro de conexão", "error");
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Navbar onOpenCreateModal={() => setIsModalOpen(true)} />
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Eventos Disponíveis</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
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
                                        <div style={{ height: '140px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                                            <img
                                                src={evento.imagem || '/logo.jpg'}
                                                alt={evento.nome}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: evento.imagem ? 'cover' : 'contain',
                                                    padding: evento.imagem ? '0' : '1.5rem'
                                                }}
                                            />
                                        </div>
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
                                            <div style={{ height: '140px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
                                                <img
                                                    src={evento.imagem || '/logo.jpg'}
                                                    alt={evento.nome}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: evento.imagem ? 'cover' : 'contain',
                                                        filter: 'grayscale(100%)',
                                                        padding: evento.imagem ? '0' : '1.5rem',
                                                        opacity: 0.7
                                                    }}
                                                />
                                            </div>
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

            {/* Modal Novo Evento */}
            <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={() => setIsModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="modal-header" style={{ margin: 0, textAlign: 'left' }}>Novo Evento</h2>
                        <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                    </div>

                    <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nome do Evento</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Congresso 2026"
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Data</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.data}
                                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Hora</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Local</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Auditório Principal"
                                value={formData.local}
                                onChange={e => setFormData({ ...formData, local: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Imagem (Opcional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <input
                                    type="checkbox"
                                    id="permitirAcompanhantes"
                                    checked={formData.permitir_acompanhantes}
                                    onChange={e => setFormData({ ...formData, permitir_acompanhantes: e.target.checked })}
                                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                />
                                <label htmlFor="permitirAcompanhantes" style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95rem' }}>
                                    Permitir Acompanhantes
                                </label>
                            </div>

                            {formData.permitir_acompanhantes && (
                                <div style={{ paddingLeft: '2rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Máximo de Acompanhantes por Pessoa (0 = Ilimitado)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_acompanhantes}
                                        onChange={e => setFormData({ ...formData, max_acompanhantes: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100px', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={creating}
                            className="btn-primary"
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            {creating ? 'Criando...' : 'Criar e Acessar'}
                        </button>
                    </form>
                </div>
            </div >

            <MessageModal
                isOpen={messageModal.open}
                onClose={closeMessage}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
            />
        </>
    );
}

export default EventList;
