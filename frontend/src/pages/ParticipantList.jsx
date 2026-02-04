import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const API_URL = 'http://localhost:3000/api';

function ParticipantList() {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [editingParticipant, setEditingParticipant] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // FaceAPI State
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (e) {
                console.error("Erro ao carregar modelos:", e);
            }
        };
        loadModels();
    }, []);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setEditingParticipant(prev => ({ ...prev, foto: imageSrc, template_biometrico: null })); // Reseta template ao tirar foto nova
        setShowCamera(false);
    }, [webcamRef]);

    const fetchParticipants = async (p = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/participantes?page=${p}&limit=20`);
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonErr) {
                throw new Error("Resposta inválida (404/HTML)");
            }

            if (res.ok && data.data) {
                setParticipants(data.data);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            } else {
                throw new Error(data.msg || "Erro na API");
            }
        } catch (e) {
            console.warn("API de lista falhou, ativando fallback temporário...", e);
            // Fallback: carregar dos logs para não mostrar tela vazia se o endpoint novo não existir ainda
            try {
                const resLogs = await fetch(`${API_URL}/logs`);
                if (resLogs.ok) {
                    const logs = await resLogs.json();
                    const uniqueMap = new Map();
                    // Extrair participantes únicos dos logs recentes
                    logs.forEach(log => {
                        if (log.Participante && log.Participante.id) {
                            uniqueMap.set(log.Participante.id, log.Participante);
                        }
                    });
                    const uniqueParticipants = Array.from(uniqueMap.values());
                    setParticipants(uniqueParticipants);
                    setTotal(uniqueParticipants.length);
                    setTotalPages(1);
                }
            } catch (errFallback) {
                console.error("Fallback também falhou", errFallback);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchParticipants(page);
    }, [page]);

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita.")) return;

        try {
            const res = await fetch(`${API_URL}/participantes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Participante excluído com sucesso.");
                fetchParticipants(page);
            } else {
                const data = await res.json();
                alert(data.msg || "Erro ao excluir participante.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao conectar ao servidor.");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let descriptor = editingParticipant.template_biometrico;

            // Se tem uma nova foto base64 mas não tem template (processamento pendente)
            if (editingParticipant.foto && editingParticipant.foto.startsWith('data:image') && !descriptor) {
                if (modelsLoaded) {
                    try {
                        const img = await faceapi.fetchImage(editingParticipant.foto);
                        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                        if (detection) {
                            descriptor = JSON.stringify(Array.from(detection.descriptor));
                        } else {
                            if (!confirm("Não detectamos rosto na foto nova. Salvar mesmo assim sem biometria facial?")) {
                                setLoading(false);
                                return;
                            }
                            descriptor = `PHOTO_ONLY_${Date.now()}`;
                        }
                    } catch (err) {
                        console.error("Erro face-api:", err);
                    }
                }
            }

            const res = await fetch(`${API_URL}/participantes/${editingParticipant.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingParticipant,
                    template_biometrico: descriptor
                })
            });

            if (res.ok) {
                alert("Cadastro atualizado com sucesso!");
                setEditingParticipant(null);
                fetchParticipants(page || 1);
            } else {
                const data = await res.json();
                alert(data.msg || data.error || data.details || "Erro ao atualizar.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao conectar ao servidor: " + e.message);
        }
        setLoading(false);
    };

    const hasBio = (p) => p.template_biometrico && p.template_biometrico.length > 50;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-color)' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>Participantes Cadastrados</h1>
                    <div className="badge" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>{total} Registros</div>
                </div>

                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="log-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gênero</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biometria</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Carregando...</td>
                                    </tr>
                                ) : participants.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nenhum participante encontrado.</td>
                                    </tr>
                                ) : (
                                    participants.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>{p.nome}</td>
                                            <td style={{ padding: '1rem', color: '#6b7280' }}>{p.documento || p.cpf || '-'}</td>
                                            <td style={{ padding: '1rem', color: '#6b7280' }}>{p.genero}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={`badge ${p.categoria === 'Medico' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                                                    {p.categoria}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {hasBio(p) ? (
                                                    <span title="Cadastrada" style={{ color: 'var(--success-color)', fontSize: '1.2rem' }}>✓</span>
                                                ) : (
                                                    <span title="Pendente" style={{ color: '#e5e7eb', fontSize: '1.2rem' }}>•</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setEditingParticipant(p)}
                                                        className="btn-secondary"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="btn-secondary"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                        <button
                            className="btn-secondary"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                            Anterior
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            Página {page} de {totalPages || 1}
                        </span>
                        <button
                            className="btn-secondary"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Edição */}
            {editingParticipant && (
                <div className="modal-overlay open">
                    <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
                        <h2 className="modal-header">Editar Participante</h2>
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap-reverse' }}>
                            {/* Dados */}
                            <form onSubmit={handleUpdate} style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <label className="info-label">Nome Completo</label>
                                    <input
                                        className="modal-input"
                                        style={{ textAlign: 'left' }}
                                        value={editingParticipant.nome}
                                        onChange={e => setEditingParticipant({ ...editingParticipant, nome: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="info-label">CPF</label>
                                        <input
                                            className="modal-input"
                                            style={{ textAlign: 'left' }}
                                            value={editingParticipant.cpf || editingParticipant.documento || ''}
                                            onChange={e => setEditingParticipant({ ...editingParticipant, cpf: e.target.value, documento: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="info-label">CRM (Opcional)</label>
                                        <input
                                            className="modal-input"
                                            style={{ textAlign: 'left' }}
                                            value={editingParticipant.crm || ''}
                                            onChange={e => setEditingParticipant({ ...editingParticipant, crm: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="info-label">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            className="modal-input"
                                            style={{ textAlign: 'left' }}
                                            value={editingParticipant.data_nascimento || ''}
                                            onChange={e => setEditingParticipant({ ...editingParticipant, data_nascimento: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="info-label">Gênero</label>
                                        <select
                                            className="modal-input"
                                            style={{ textAlign: 'left' }}
                                            value={editingParticipant.genero}
                                            onChange={e => setEditingParticipant({ ...editingParticipant, genero: e.target.value })}
                                        >
                                            <option value="M">Masculino</option>
                                            <option value="F">Feminino</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <label className="info-label">Categoria</label>
                                    <select
                                        className="modal-input"
                                        style={{ textAlign: 'left' }}
                                        value={editingParticipant.categoria}
                                        onChange={e => setEditingParticipant({ ...editingParticipant, categoria: e.target.value })}
                                    >
                                        <option value="Participante">Participante</option>
                                        <option value="Medico">Médico</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>

                                <div className="modal-actions" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                    <button type="button" className="btn-secondary" onClick={() => { setEditingParticipant(null); setShowCamera(false); }}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={loading}>
                                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>

                            {/* Biometria */}
                            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '12px' }}>
                                <label className="info-label" style={{ marginBottom: '1rem' }}>Foto da Biometria</label>

                                {showCamera ? (
                                    <div style={{ width: '100%', position: 'relative' }}>
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            style={{ width: '100%', borderRadius: '8px' }}
                                        />
                                        <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                onClick={capture}
                                                style={{ border: '4px solid white' }}
                                            >
                                                📸 Capturar Foto
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        {editingParticipant.foto ? (
                                            <img
                                                src={editingParticipant.foto}
                                                alt="Preview"
                                                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '50%', border: '4px solid var(--accent-color)' }}
                                            />
                                        ) : (
                                            <div style={{ width: '200px', height: '200px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#9ca3af' }}>
                                                👤
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setShowCamera(true)}
                                            disabled={!modelsLoaded}
                                        >
                                            {editingParticipant.foto ? 'Alterar Foto' : 'Adicionar Biometria'}
                                        </button>
                                        {!modelsLoaded && <small style={{ color: '#ef4444' }}>Aguardando IA carregar...</small>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ParticipantList;
