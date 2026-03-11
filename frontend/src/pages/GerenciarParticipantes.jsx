import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';
import { BiometricScanner } from '../components/BiometricScanner';

const API_URL = 'http://localhost:3000/api';

const FingerprintIcon = ({ size = "1em", ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94.28 0 .5.22.5.5s-.22.5-.5.5c-1.7 0-3.08-1.32-3.08-2.94 0-1.07-.93-1.94-2.08-1.94-1.15 0-2.08.87-2.08 1.94 0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z" />
    </svg>
);

function GerenciarParticipantes() {
    const { token } = useAuth();
    const [participantes, setParticipantes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState(null);
    const [enriqStatus, setEnriqStatus] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBioModalOpen, setIsBioModalOpen] = useState(false);
    const [currentParticipante, setCurrentParticipante] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [formData, setFormData] = useState({ nome: '', cpf: '', crm: '', genero: 'M', data_nascimento: '', especialidade: '' });

    // Message State
    const [msgModal, setMsgModal] = useState({ isOpen: false, type: '', message: '' });

    useEffect(() => {
        const fetchDados = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/participantes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setParticipantes(data);
                } else {
                    console.error('Erro ao carregar participantes:', data.error);
                }

                const resSync = await fetch(`${API_URL}/participantes/sync/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const dataSync = await resSync.json();
                if (resSync.ok && dataSync.status !== 'nenhum_registro') {
                    setSyncStatus(dataSync);
                }

                const resEnriq = await fetch(`${API_URL}/participantes/enriquecimento/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resEnriq.ok) {
                    setEnriqStatus(await resEnriq.json());
                }
            } catch (error) {
                console.error('Erro de conexão ao carregar dados:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDados();
    }, [token]);

    const showMsg = (type, message) => setMsgModal({ isOpen: true, type, message });
    const closeMsg = () => setMsgModal({ isOpen: false, type: '', message: '' });

    const openModal = (participante = null, readOnly = false) => {
        setIsReadOnly(readOnly);
        if (participante) {
            setCurrentParticipante(participante);
            setFormData({
                nome: participante.nome || '',
                cpf: participante.cpf || '',
                crm: participante.crm || '',
                genero: participante.genero || 'O',
                data_nascimento: participante.data_nascimento || '',
                especialidade: participante.especialidade || ''
            });
        } else {
            setCurrentParticipante(null);
            setFormData({ nome: '', cpf: '', crm: '', genero: 'M', data_nascimento: '', especialidade: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentParticipante(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const method = currentParticipante ? 'PUT' : 'POST';
        const url = currentParticipante ? `${API_URL}/participantes/${currentParticipante.id}` : `${API_URL}/participantes`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                showMsg('success', data.msg);
                closeModal();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showMsg('error', data.error || 'Erro ao salvar.');
            }
        } catch (error) {
            showMsg('error', 'Erro de conexão ao salvar.');
        }
    };

    const openBioModal = (participante) => {
        setCurrentParticipante(participante);
        setIsBioModalOpen(true);
    };

    const closeBioModal = () => {
        setIsBioModalOpen(false);
        setCurrentParticipante(null);
    };

    const handleBiometriaCaptured = async (template) => {
        if (!currentParticipante) return;

        try {
            const res = await fetch(`${API_URL}/participantes/${currentParticipante.id}/biometria`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ template })
            });

            const data = await res.json();

            if (res.ok) {
                showMsg('success', data.msg);
                closeBioModal();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showMsg('error', data.error || 'Erro ao gravar biometria.');
            }
        } catch (err) {
            showMsg('error', 'Erro de conexão ao salvar biometria.');
        }
    };

    const filteredParticipantes = participantes.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cpf && p.cpf.includes(searchTerm)) ||
        (p.crm && p.crm.includes(searchTerm))
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
        }
        return cpf;
    };

    const formatCPF = (cpf) => {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9, 11)}`;
        }
        return cpf;
    };

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>Controle de participantes</h1>
                    <button onClick={() => openModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        + Adicionar Participante
                    </button>
                </div>

                {syncStatus && (
                    <div className="card" style={{ 
                        marginBottom: '2rem', 
                        padding: '1.2rem 1.5rem', 
                        backgroundColor: '#eaf4ff', 
                        border: '1px solid #b6d4fe',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 4px 12px rgba(0, 64, 133, 0.08)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-10.36l5.25 5.25" /></svg>
                                    <p style={{ margin: 0, fontWeight: 'bold', color: '#004085', fontSize: '1.05rem' }}>Status da Sincronização Automática</p>
                                </div>
                                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#4a5568' }}>
                                    Última atualização: <strong>{formatDate(syncStatus.data_sync)}</strong>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                                <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fff', borderRadius: '8px', minWidth: '80px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontWeight: 'bold', color: '#28a745', fontSize: '1.2rem' }}>{syncStatus.qtd_adicionados}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Novos</div>
                                </div>
                                <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fff', borderRadius: '8px', minWidth: '80px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontWeight: 'bold', color: '#ffc107', fontSize: '1.2rem' }}>{syncStatus.qtd_modificados}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Modificados</div>
                                </div>
                                <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fff', borderRadius: '8px', minWidth: '80px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontWeight: 'bold', color: '#dc3545', fontSize: '1.2rem' }}>{syncStatus.qtd_removidos}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Inativados</div>
                                </div>
                                <div style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fff', borderRadius: '8px', minWidth: '80px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '1.2rem' }}>{syncStatus.total_participantes}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Total Ativos</div>
                                </div>
                            </div>
                        </div>

                        {/* Saúde da Base Integrada */}
                        {enriqStatus && (
                            <div style={{ 
                                paddingTop: '1rem', 
                                borderTop: '1px solid #b6d4fe',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#004085', fontSize: '0.88rem' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        <span style={{ fontWeight: '700' }}>Saúde da Base (Perfis Completos):</span>
                                        <span style={{ color: enriqStatus.completo ? '#28a745' : '#ca8a04', fontWeight: 'bold' }}>
                                            {enriqStatus.enriquecidos} de {enriqStatus.total} ({enriqStatus.percentual}%)
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#004085' }}>{enriqStatus.percentual}%</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '99px', overflow: 'hidden', border: '1px solid #b6d4fe' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${enriqStatus.percentual}%`,
                                        borderRadius: '99px',
                                        backgroundColor: enriqStatus.completo ? '#38a169' : '#f6ad55',
                                        transition: 'width 0.8s ease'
                                    }} />
                                </div>
                                {!enriqStatus.completo && (
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#004085', fontStyle: 'italic', opacity: 0.8 }}>
                                        * {enriqStatus.pendentes} cooperados aguardando próximo login para complementar dados.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}


                <div className="card" style={{ marginBottom: '2rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou CRM..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modal-input"
                        style={{ width: '100%', maxWidth: '400px', marginBottom: 0, textAlign: 'left' }}
                    />
                </div>

                <div className="table-container">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Carregando participantes...</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ padding: '1.2rem' }}>Nome</th>
                                    <th style={{ padding: '1.2rem' }}>CPF</th>
                                    <th style={{ padding: '1.2rem' }}>CRM</th>
                                    <th style={{ padding: '1.2rem' }}>Especialidade</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'center' }}>Biometria</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                             <tbody>
                                 {filteredParticipantes.map(p => (
                                     <tr 
                                        key={p.id} 
                                        onClick={() => openModal(p, true)}
                                        className="table-row-clickable"
                                        style={{ cursor: 'pointer' }}
                                     >
                                         <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>{p.nome}</td>
                                        <td style={{ padding: '1.2rem', fontFamily: 'monospace' }}>{maskCPF(p.cpf)}</td>
                                        <td style={{ padding: '1.2rem' }}>{p.crm || '-'}</td>
                                        <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: '#4a5568' }}>{p.especialidade || '-'}</td>
                                        <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                                {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                                                    <>
                                                        <span title="Biometria Cadastrada" style={{ color: '#4CAF50', display: 'flex' }}>
                                                            <FingerprintIcon size="1.8rem" />
                                                        </span>
                                                        {p.data_biometria && (
                                                            <span style={{ fontSize: '0.65rem', color: '#718096', fontWeight: '500' }}>
                                                                {formatDate(p.data_biometria)}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span title="Sem Biometria" style={{ color: '#666', opacity: 0.3, filter: 'grayscale(100%)', display: 'flex' }}>
                                                        <FingerprintIcon size="1.8rem" />
                                                    </span>
                                                )}
                                            </div>
                                         </td>
                                         <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                             <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); openBioModal(p); }}
                                                     className="btn-primary"
                                                     style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                 >
                                                     <FingerprintIcon size="1.2rem" /> Biometria
                                                 </button>
                                             </div>
                                         </td>
                                    </tr>
                                ))}
                                {filteredParticipantes.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#a0aec0' }}>
                                            Nenhum participante encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
                 {/* Modal de Formulário */}
             <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={closeModal}>
                 <div className="modal-content" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
                     <h2 className="modal-header">
                         {isReadOnly ? 'Detalhes do Participante' : (currentParticipante ? 'Editar Participante' : 'Novo Participante')}
                     </h2>
 
                     <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         <div>
                             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Nome Completo *</label>
                             <input
                                 type="text"
                                 className="modal-input"
                                 value={formData.nome}
                                 onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                 placeholder="Ex: João da Silva"
                                 required
                                 disabled={isReadOnly}
                                 style={{ marginBottom: 0 }}
                             />
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                             <div>
                                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>CPF</label>
                                 <input
                                     type="text"
                                     className="modal-input"
                                     value={isReadOnly ? formatCPF(formData.cpf) : formData.cpf}
                                     onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                     placeholder="000.000.000-00"
                                     disabled={isReadOnly}
                                     style={{ marginBottom: 0 }}
                                 />
                             </div>
                             <div>
                                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>CRM</label>
                                 <input
                                     type="text"
                                     className="modal-input"
                                     value={formData.crm}
                                     onChange={e => setFormData({ ...formData, crm: e.target.value })}
                                     placeholder="123456"
                                     disabled={isReadOnly}
                                     style={{ marginBottom: 0 }}
                                 />
                             </div>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                             <div>
                                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Gênero</label>
                                 <select
                                     className="modal-input"
                                     value={formData.genero}
                                     onChange={e => setFormData({ ...formData, genero: e.target.value })}
                                     disabled={isReadOnly}
                                     style={{ marginBottom: 0 }}
                                 >
                                     <option value="M">Masculino</option>
                                     <option value="F">Feminino</option>
                                     <option value="O">Outro</option>
                                 </select>
                             </div>
                             <div>
                                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Nascimento</label>
                                 <input
                                     type="date"
                                     className="modal-input"
                                     value={formData.data_nascimento}
                                     onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                                     disabled={isReadOnly}
                                     style={{ marginBottom: 0 }}
                                 />
                             </div>
                         </div>
                         <div>
                             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Especialidade</label>
                             <input
                                 type="text"
                                 className="modal-input"
                                 value={formData.especialidade}
                                 onChange={e => setFormData({ ...formData, especialidade: e.target.value })}
                                 placeholder="Ex: Cardiologia"
                                 disabled={isReadOnly}
                                 style={{ marginBottom: 0 }}
                             />
                         </div>
                         {isReadOnly && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '1rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '10px',
                                    backgroundColor: (currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) ? '#e6fffa' : '#fff5f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: (currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) ? '#38a169' : '#e53e3e'
                                }}>
                                    <FingerprintIcon size="1.8rem" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Segurança e Biometria
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                        <span style={{ 
                                            fontSize: '0.95rem', 
                                            fontWeight: '700',
                                            color: (currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) ? '#2d3748' : '#e53e3e'
                                        }}>
                                            {(currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) ? 'Biometria Cadastrada' : 'Biometria Pendente'}
                                        </span>
                                        {(currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) && (
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                backgroundColor: '#c6f6d5', 
                                                color: '#22543d', 
                                                padding: '2px 8px', 
                                                borderRadius: '99px',
                                                fontWeight: 'bold'
                                            }}>
                                                Ativo
                                            </span>
                                        )}
                                    </div>
                                    {(currentParticipante?.template_biometrico && !currentParticipante.template_biometrico.startsWith('manual_')) && currentParticipante.data_biometria && (
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#718096' }}>
                                            Última captura: <strong>{formatDate(currentParticipante.data_biometria)}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                             <button type="button" className="btn-secondary" onClick={closeModal} style={{ flex: 1 }}>
                                 {isReadOnly ? 'Fechar' : 'Cancelar'}
                             </button>
                             {!isReadOnly && (
                                 <button type="submit" className="btn-primary" style={{ flex: 1 }}>Salvar</button>
                             )}
                         </div>
                     </form>
                 </div>
             </div>

            {/* Modal de Biometria */}
            <div className={`modal-overlay ${isBioModalOpen ? 'open' : ''}`} onClick={closeBioModal}>
                <div className="modal-content" style={{ textAlign: 'center', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                    <h2 className="modal-header">Renovar Biometria</h2>
                    {currentParticipante && <p style={{ color: 'var(--accent-color)', marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>{currentParticipante.nome}</p>}

                    <div style={{
                        padding: '2rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: '2px dashed var(--border-color)'
                    }}>
                        <FingerprintIcon size="4rem" style={{ marginBottom: '1rem', color: 'var(--accent-color)' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Posicione o dedo no leitor biométrico</p>
                    </div>

                    <BiometricScanner
                        onScanSuccess={handleBiometriaCaptured}
                        checkOnly={false}
                    />

                    <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                        <button type="button" className="btn-secondary" onClick={closeBioModal} style={{ width: '100%' }}>Fechar</button>
                    </div>
                </div>
            </div>

            <MessageModal
                isOpen={msgModal.isOpen}
                type={msgModal.type}
                title={msgModal.type === 'success' ? 'Sucesso' : 'Erro'}
                message={msgModal.message}
                onClose={closeMsg}
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
        </>
    );
}

export default GerenciarParticipantes;
