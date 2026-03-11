import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';
import { useAuth } from '../contexts/AuthContext';

function ListaEventos() {
    const navigate = useNavigate();
    const location = useLocation();
    const { token, isAdmin } = useAuth();
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
        max_acompanhantes: 0,
        habilitar_checkout: false
    });
    const [creating, setCreating] = useState(false);
    const [messageModal, setMessageModal] = useState({ open: false, title: '', message: '', type: 'info' });
    const [syncSummary, setSyncSummary] = useState(null);
    const [showSyncLog, setShowSyncLog] = useState(false);

    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
        }
        return cpf;
    };

    const showMessage = (title, message, type = 'info') => {
        setMessageModal({ open: true, title, message, type });
    };

    const closeMessage = () => setMessageModal({ ...messageModal, open: false });

    useEffect(() => {
        if (token) {
            fetchEventos();
            checkSyncStatus();
        }
        if (location.state?.openModal && isAdmin()) {
            setIsModalOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location, token]);

    const checkSyncStatus = () => {
        setTimeout(async () => {
            try {
                const res = await fetch('http://localhost:3000/api/participantes/sync/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.status !== 'nenhum_registro' && data.data_sync) {
                        const syncDate = new Date(data.data_sync);
                        const now = new Date();
                        const diffMs = now - syncDate;
                        if (diffMs < 12 * 60 * 60 * 1000) {
                            setSyncSummary(data);
                        }
                    }
                }

            } catch (err) {
                console.error("Erro ao checar status do sync:", err);
            }
        }, 1000);
    };

    const fetchEventos = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/eventos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) return;
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
            const res = await fetch(`http://localhost:3000/api/eventos/${id}/ativar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ nome: '', data: '', hora: '', local: '', imagem: '', permitir_acompanhantes: false, max_acompanhantes: 0, habilitar_checkout: false });
                fetchEventos();
                navigate('/access');
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
                    {isAdmin() && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                padding: '0.8rem 2rem',
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
                    )}
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <>
                        {syncSummary && (
                            <div style={{
                                backgroundColor: '#ffffff',
                                color: 'var(--text-primary)',
                                padding: '1rem 1.5rem',
                                borderRadius: '8px',
                                marginBottom: '2rem',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                fontSize: '0.95rem'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        <strong style={{ fontSize: '1.05rem', color: '#1a202c' }}>Sincronização de Cooperados Concluída</strong>
                                    </div>
                                    <span style={{ color: '#4a5568', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>Os dados do banco da Unimed Maceió foram atualizados com sucesso no sistema.</span>
                                        {syncSummary.data_sync && (
                                            <span style={{ fontSize: '0.75rem', color: '#718096', opacity: 0.8 }}>
                                                Última sincronização: {new Date(syncSummary.data_sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', textAlign: 'center', alignItems: 'center' }}>
                                    <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f0fdf4', borderRadius: '6px', minWidth: '70px', border: '1px solid #bbf7d0' }}>
                                        <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.1rem' }}>{syncSummary.qtd_adicionados}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 'bold', textTransform: 'uppercase' }}>Novos</div>
                                    </div>
                                    <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fefce8', borderRadius: '6px', minWidth: '70px', border: '1px solid #fef08a' }}>
                                        <div style={{ fontWeight: 'bold', color: '#ca8a04', fontSize: '1.1rem' }}>{syncSummary.qtd_modificados}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#a16207', fontWeight: 'bold', textTransform: 'uppercase' }}>Modificados</div>
                                    </div>
                                    <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fef2f2', borderRadius: '6px', minWidth: '70px', border: '1px solid #fecaca' }}>
                                        <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem' }}>{syncSummary.qtd_removidos}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 'bold', textTransform: 'uppercase' }}>Inativados</div>
                                    </div>
                                    <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#eff6ff', borderRadius: '6px', minWidth: '70px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>{syncSummary.total_participantes}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 'bold', textTransform: 'uppercase' }}>Total</div>
                                    </div>

                                    {syncSummary.log_detalhado && (
                                        <button 
                                            onClick={() => setShowSyncLog(!showSyncLog)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: showSyncLog ? '#cbd5e0' : 'var(--accent-color)',
                                                color: showSyncLog ? '#4a5568' : 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            {showSyncLog ? 'Ocultar Log' : '🔍 Ver Detalhes'}
                                        </button>
                                    )}

                                    <div style={{ height: '30px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }}></div>
                                    <button onClick={() => setSyncSummary(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0', padding: '0.2rem 0.5rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#4a5568'} onMouseOut={(e) => e.target.style.color = '#a0aec0'}>×</button>
                                </div>
                            </div>
                        )}

                    {syncSummary && showSyncLog && syncSummary.log_detalhado && (
                            <div style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                marginBottom: '2rem',
                                border: '1px solid #e2e8f0',
                                animation: 'slideDown 0.3s ease-out',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                    📋 Detalhamento das Alterações
                                </h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {/* Adicionados */}
                                    <div>
                                        <h4 style={{ color: '#16a34a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                                            Participantes Importados ({JSON.parse(syncSummary.log_detalhado).adicionados.length})
                                        </h4>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #edf2f7', fontSize: '0.85rem' }}>
                                            {JSON.parse(syncSummary.log_detalhado).adicionados.length > 0 ? (
                                                JSON.parse(syncSummary.log_detalhado).adicionados.map((p, idx) => (
                                                    <div key={idx} style={{ padding: '0.6rem', borderBottom: idx < JSON.parse(syncSummary.log_detalhado).adicionados.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                        <div style={{ fontWeight: '600', color: '#1a202c' }}>{p.nome}</div>
                                                        <div style={{ color: '#718096', fontSize: '0.75rem' }}>
                                                            CPF: {maskCPF(p.cpf)} {p.crm && `| CRM: ${p.crm}`}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <div style={{ padding: '1rem', color: '#a0aec0', fontStyle: 'italic' }}>Nenhum novo.</div>}
                                        </div>
                                    </div>

                                    {/* Modificados */}
                                    <div>
                                        <h4 style={{ color: '#ca8a04', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ca8a04' }}></span>
                                            Sincronizados/Vencidos ({JSON.parse(syncSummary.log_detalhado).modificados.length})
                                        </h4>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #edf2f7', fontSize: '0.85rem' }}>
                                            {JSON.parse(syncSummary.log_detalhado).modificados.length > 0 ? (
                                                JSON.parse(syncSummary.log_detalhado).modificados.map((p, idx) => (
                                                    <div key={idx} style={{ padding: '0.6rem', borderBottom: idx < JSON.parse(syncSummary.log_detalhado).modificados.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                        <div style={{ fontWeight: '600', color: '#1a202c' }}>{p.nome}</div>
                                                        <div style={{ color: '#718096', fontSize: '0.75rem' }}>
                                                            CPF: {maskCPF(p.cpf)} {p.crm && `| CRM: ${p.crm}`}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <div style={{ padding: '1rem', color: '#a0aec0', fontStyle: 'italic' }}>Nenhum modificado.</div>}
                                        </div>
                                    </div>

                                    {/* Inativados */}
                                    <div>
                                        <h4 style={{ color: '#dc2626', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span>
                                            Inativados ({JSON.parse(syncSummary.log_detalhado).inativados.length})
                                        </h4>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #edf2f7', fontSize: '0.85rem' }}>
                                            {JSON.parse(syncSummary.log_detalhado).inativados.length > 0 ? (
                                                JSON.parse(syncSummary.log_detalhado).inativados.map((p, idx) => (
                                                    <div key={idx} style={{ padding: '0.6rem', borderBottom: idx < JSON.parse(syncSummary.log_detalhado).inativados.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                        <div style={{ fontWeight: '600', color: '#1a202c' }}>{p.nome}</div>
                                                        <div style={{ color: '#718096', fontSize: '0.75rem' }}>
                                                            CPF: {maskCPF(p.cpf)} {p.crm && `| CRM: ${p.crm}`}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : <div style={{ padding: '1rem', color: '#a0aec0', fontStyle: 'italic' }}>Nenhum inativado.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {eventos.filter(e => e.status !== 'finalizado').length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Nenhum evento disponível no momento.</p>
                            ) : (
                                eventos.filter(e => e.status !== 'finalizado').map(evento => (
                                    <div key={evento.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{ height: '140px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                            <img
                                                src={evento.imagem || '/logo.jpg'}
                                                alt={evento.nome}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
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

                        {eventos.filter(e => e.status === 'finalizado').length > 0 && isAdmin() && (
                            <>
                                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '3rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                                    Histórico de Eventos
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', opacity: 0.8 }}>
                                    {eventos.filter(e => e.status === 'finalizado').map(evento => (
                                        <div key={evento.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ height: '140px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                                <img
                                                    src={evento.imagem || '/logo.jpg'}
                                                    alt={evento.nome}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
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
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        required
                                        value={formData.hora ? formData.hora.split(':')[0] : ''}
                                        onChange={e => {
                                            const hour = e.target.value;
                                            const minute = formData.hora ? formData.hora.split(':')[1] : '00';
                                            setFormData({ ...formData, hora: `${hour}:${minute}` });
                                        }}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box', backgroundColor: 'white' }}
                                    >
                                        <option value="">Hora</option>
                                        {Array.from({ length: 24 }).map((_, i) => {
                                            const hour = i.toString().padStart(2, '0');
                                            return <option key={hour} value={hour}>{hour}</option>;
                                        })}
                                    </select>
                                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>:</span>
                                    <select
                                        required
                                        value={formData.hora ? formData.hora.split(':')[1] : ''}
                                        onChange={e => {
                                            const minute = e.target.value;
                                            const hour = formData.hora ? formData.hora.split(':')[0] : '00';
                                            setFormData({ ...formData, hora: `${hour}:${minute}` });
                                        }}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box', backgroundColor: 'white' }}
                                    >
                                        <option value="">Min</option>
                                        {['00', '15', '30', '45'].map(minute => (
                                            <option key={minute} value={minute}>{minute}</option>
                                        ))}
                                    </select>
                                </div>
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

                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <input
                                    type="checkbox"
                                    id="habilitarCheckout"
                                    checked={formData.habilitar_checkout}
                                    onChange={e => setFormData({ ...formData, habilitar_checkout: e.target.checked })}
                                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                />
                                <label htmlFor="habilitarCheckout" style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.95rem' }}>
                                    Habilitar Checkout (Registro de Saída)
                                </label>
                            </div>
                            <p style={{ marginTop: '0.5rem', marginLeft: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Permite registrar a hora de saída dos participantes
                            </p>
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

            {/* Botões de Navegação (Topo / Fim) */}
            <div style={{ position: 'fixed', bottom: '2rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1001 }}>
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="Ir para o topo"
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                </button>

                <button
                    onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                    title="Ir para o fim"
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
            </div>
            {/* Estilos para animações do log */}
            <style>
                {`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                `}
            </style>
        </>
    );
}

export default ListaEventos;
