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

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBioModalOpen, setIsBioModalOpen] = useState(false);
    const [currentParticipante, setCurrentParticipante] = useState(null);
    const [formData, setFormData] = useState({ nome: '', cpf: '', crm: '', genero: 'Masculino', data_nascimento: '' });

    // Message State
    const [msgModal, setMsgModal] = useState({ isOpen: false, type: '', message: '' });

    useEffect(() => {
        const fetchParticipantes = async () => {
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
            } catch (error) {
                console.error('Erro de conexão ao carregar participantes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchParticipantes();
    }, [token]);

    const showMsg = (type, message) => setMsgModal({ isOpen: true, type, message });
    const closeMsg = () => setMsgModal({ isOpen: false, type: '', message: '' });

    const openModal = (participante = null) => {
        if (participante) {
            setCurrentParticipante(participante);
            setFormData({
                nome: participante.nome || '',
                cpf: participante.cpf || '',
                crm: participante.crm || '',
                genero: participante.genero || 'Masculino',
                data_nascimento: participante.data_nascimento || ''
            });
        } else {
            setCurrentParticipante(null);
            setFormData({ nome: '', cpf: '', crm: '', genero: 'Masculino', data_nascimento: '' });
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

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este participante?')) return;
        try {
            const res = await fetch(`${API_URL}/participantes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                showMsg('success', data.msg);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showMsg('error', data.error || 'Erro ao deletar.');
            }
        } catch (error) {
            showMsg('error', 'Erro de conexão ao deletar.');
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

    return (
        <div className="layout">
            <Navbar />
            <div className="main-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.8rem', color: '#333' }}>Controle de participantes</h2>
                    <button onClick={() => openModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', borderRadius: '8px' }}>
                        <span>+</span> Adicionar Participante
                    </button>
                </div>

                <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou CRM..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ width: '100%', maxWidth: '450px', padding: '0.8rem 1.2rem', borderRadius: '10px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    />
                </div>

                <div className="card" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #eee' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Carregando participantes...</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left', backgroundColor: '#f9fafb' }}>
                                    <th style={{ padding: '1.2rem' }}>Nome</th>
                                    <th style={{ padding: '1.2rem' }}>CPF</th>
                                    <th style={{ padding: '1.2rem' }}>CRM</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'center' }}>Biometria</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParticipantes.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '1.2rem', fontWeight: 'bold', color: '#2d3748' }}>{p.nome}</td>
                                        <td style={{ padding: '1.2rem', color: '#718096', fontSize: '0.9rem' }}>{p.cpf || '-'}</td>
                                        <td style={{ padding: '1.2rem', color: '#718096', fontSize: '0.9rem' }}>{p.crm || '-'}</td>
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
                                                    onClick={() => openBioModal(p)}
                                                    className="btn-primary"
                                                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                >
                                                    <FingerprintIcon size="1.2rem" /> Biometria
                                                </button>
                                                <button
                                                    onClick={() => openModal(p)}
                                                    className="btn-secondary"
                                                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="btn-secondary"
                                                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                                                >
                                                    Excluir
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
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '550px', padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{currentParticipante ? 'Editar Participante' : 'Novo Participante'}</h3>
                        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>Preencha as informações abaixo para {currentParticipante ? 'atualizar o cadastro' : 'cadastrar um novo participante'}.</p>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>Nome Completo *</label>
                                <input
                                    type="text"
                                    className="modal-input"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                    required
                                    style={{ padding: '0.8rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>CPF</label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                        style={{ padding: '0.8rem' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>CRM</label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        value={formData.crm}
                                        onChange={e => setFormData({ ...formData, crm: e.target.value })}
                                        placeholder="123456"
                                        style={{ padding: '0.8rem' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>Gênero</label>
                                    <select
                                        className="modal-input"
                                        value={formData.genero}
                                        onChange={e => setFormData({ ...formData, genero: e.target.value })}
                                        style={{ padding: '0.8rem' }}
                                    >
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#4a5568' }}>Data de Nascimento</label>
                                    <input
                                        type="date"
                                        className="modal-input"
                                        value={formData.data_nascimento}
                                        onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })}
                                        style={{ padding: '0.8rem' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '1rem', gap: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={closeModal} style={{ flex: 1, padding: '0.8rem' }}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '0.8rem' }}>Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Biometria */}
            {isBioModalOpen && currentParticipante && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: '450px', padding: '2.5rem', borderRadius: '20px' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Renovar Biometria</h3>
                        <p style={{ color: '#4a5568', marginBottom: '2rem', fontWeight: 'bold' }}>{currentParticipante.nome}</p>

                        <div style={{
                            padding: '2.5rem',
                            backgroundColor: '#ebf8ff',
                            border: '2px dashed #90cdf4',
                            borderRadius: '20px',
                            marginBottom: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                            <FingerprintIcon size="4rem" style={{ marginBottom: '1rem', color: '#3182ce' }} />
                            <p style={{ color: '#2b6cb0', fontWeight: 'bold', lineHeight: '1.4' }}>Coloque o dedo no leitor para gravar a nova biometria</p>
                        </div>

                        <BiometricScanner
                            onScanSuccess={handleBiometriaCaptured}
                            checkOnly={false}
                        />

                        <div className="modal-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                            <button type="button" className="btn-secondary" onClick={closeBioModal} style={{ padding: '0.8rem 2rem' }}>Cancelar / Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            <MessageModal
                isOpen={msgModal.isOpen}
                type={msgModal.type}
                message={msgModal.message}
                onClose={closeMsg}
            />
        </div>
    );
}

export default GerenciarParticipantes;
