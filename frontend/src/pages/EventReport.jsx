import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function EventReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/logs');
                const data = await res.json();
                // Filtrar apenas sucessos e com participante válido
                const successLogs = data.filter(log =>
                    log.status_validacao === 'sucesso' &&
                    log.Participante &&
                    log.Participante.nome
                );
                setLogs(successLogs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [id]);

    // Função para mascarar CPF (mostra apenas alguns dígitos)
    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        // Formato: XXX.XXX.XXX-XX -> XXX.***.**X-XX
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.**${cleaned.substring(9, 10)}-${cleaned.substring(10, 11)}`;
        }
        return cpf; // Retorna original se não for CPF válido
    };

    // Função para formatar data
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    // Função para formatar gênero
    const formatGender = (genero) => {
        if (genero === 'M') return 'H';
        if (genero === 'F') return 'M';
        return '-';
    };

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                marginRight: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '5px',
                                borderRadius: '50%',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Voltar"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        Relatório do Evento
                    </h1>
                </div>

                <div className="card">
                    <h2>Registros de Acesso (Participantes Presentes)</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Visualizando apenas entradas bem-sucedidas do evento.
                    </p>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Horário</th>
                                    <th>Participante</th>
                                    <th>CPF</th>
                                    <th>CRM</th>
                                    <th>Data de Nascimento</th>
                                    <th style={{ width: '80px' }}>Gênero</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td>{log.Participante ? log.Participante.nome : 'Desconhecido'}</td>
                                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                            {maskCPF(log.Participante?.cpf || log.Participante?.documento)}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {log.Participante?.crm || '-'}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {formatDate(log.Participante?.data_nascimento)}
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                            {formatGender(log.Participante?.genero)}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum registro encontrado.</td>
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
