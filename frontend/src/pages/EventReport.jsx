import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function EventReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Como o backend atualmente retorna logs gerais, e o foco é simulação,
        // vamos simular que estamos buscando logs deste evento específico. 
        // Em um sistema real, teríamos /api/eventos/:id/logs
        // Por ora, vamos pegar todos os logs e filtrar ou mostrar mensagem simulada se não tiver backend pronto.
        // Como o backend atual /api/logs retorna tudo, vamos mostrar tudo como exemplo (protótipo).

        const fetchLogs = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/logs'); // Usando endpoint genérico existente
                const data = await res.json();
                setLogs(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [id]);

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginRight: '1rem', color: 'var(--text-secondary)' }}>⬅</button>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>Relatório do Evento</h1>
                </div>

                <div className="card">
                    <h2>Registros de Acesso (Histórico)</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Visualizando logs do evento finalizado.
                    </p>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Horário</th>
                                    <th>Participante</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td>{log.Participante ? log.Participante.nome : 'Desconhecido'}</td>
                                        <td>
                                            <span className={`badge badge-${log.status_validacao === 'sucesso' ? 'success' : 'error'}`}>
                                                {log.status_validacao.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum registro encontrado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EventReport;
