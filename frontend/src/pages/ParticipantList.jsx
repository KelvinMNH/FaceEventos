import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

const API_URL = 'http://localhost:3000/api';

function ParticipantList() {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchParticipants = async (p = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/participantes?page=${p}&limit=20`);

            // Tenta processar resposta
            // Se backend não tem rota, pode retornar HTML (404 com fallback do framework frontend) ou erro direto
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
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Carregando...</td>
                                    </tr>
                                ) : participants.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Nenhum participante encontrado.</td>
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
        </div>
    );
}

export default ParticipantList;
