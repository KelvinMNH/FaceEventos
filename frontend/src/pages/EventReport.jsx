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

    const formatGender = (genero) => {
        if (genero === 'M') return 'H';
        if (genero === 'F') return 'M';
        return '-';
    };

    const exportToCSV = () => {
        if (!logs.length) return;

        const headers = ["Horário", "Participante", "CPF", "CRM", "Data de Nascimento", "Gênero"];
        const csvContent = [
            headers.join(","),
            ...logs.map(log => {
                const p = log.Participante || {};
                return [
                    `"${new Date(log.createdAt).toLocaleString()}"`,
                    `"${p.nome || 'Desconhecido'}"`,
                    `"${p.cpf || p.documento || ''}"`,
                    `"${p.crm || ''}"`,
                    `"${formatDate(p.data_nascimento)}"`,
                    `"${formatGender(p.genero)}"`
                ].join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_evento_${id || 'geral'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <button
                        onClick={exportToCSV}
                        style={{
                            marginLeft: 'auto',
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--accent-color)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar CSV
                    </button>
                </div>

                {/* Estatísticas Gerais */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2>Estatísticas Gerais do Evento</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                        {/* Total de Participantes */}
                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total de Participantes</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                {logs.filter(l => l.Participante?.documento !== 'Acompanhante').length}
                            </div>
                        </div>

                        {/* Total de Acompanhantes */}
                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total de Acompanhantes</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b1d249' }}>
                                {logs.filter(l => l.Participante?.documento === 'Acompanhante').length}
                            </div>
                        </div>

                        {/* Gênero */}
                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Distribuição de Gênero</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                <span style={{ color: '#74c0fc' }}>♂ {logs.filter(l => l.Participante?.genero === 'M' && l.Participante?.documento !== 'Acompanhante').length}</span>
                                <span style={{ color: '#faa2c1' }}>♀ {logs.filter(l => l.Participante?.genero === 'F' && l.Participante?.documento !== 'Acompanhante').length}</span>
                            </div>
                        </div>

                        {/* Faixa Etária Predominante */}
                        <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Faixa Etária Predominante</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {(() => {
                                    const faixas = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

                                    logs
                                        .filter(l => l.Participante?.data_nascimento && l.Participante?.documento !== 'Acompanhante')
                                        .forEach(l => {
                                            const nasc = new Date(l.Participante.data_nascimento);
                                            const hoje = new Date();
                                            let idade = hoje.getFullYear() - nasc.getFullYear();
                                            const m = hoje.getMonth() - nasc.getMonth();
                                            if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

                                            if (idade <= 25) faixas['18-25']++;
                                            else if (idade <= 35) faixas['26-35']++;
                                            else if (idade <= 50) faixas['36-50']++;
                                            else faixas['50+']++;
                                        });

                                    let maxFaixa = '-';
                                    let maxQtd = -1;
                                    for (const [faixa, qtd] of Object.entries(faixas)) {
                                        if (qtd > maxQtd) {
                                            maxQtd = qtd;
                                            maxFaixa = faixa;
                                        }
                                    }
                                    return maxFaixa === '-' ? '-' : maxFaixa + ' anos';
                                })()}
                            </div>
                        </div>
                    </div>
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
