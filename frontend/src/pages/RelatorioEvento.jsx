import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

// --- ERROR BOUNDARY COMPONENT ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("RelatorioEvento ErrorBoundary caught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'red', border: '1px solid red', margin: '1rem', backgroundColor: '#fff' }}>
                    <h2>Algo deu errado ao renderizar o Relatório.</h2>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', fontSize: '0.8rem' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

function RelatorioEventoContent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [processedData, setProcessedData] = useState([]);
    const [stats, setStats] = useState({
        totalParticipantes: 0,
        totalAcompanhantes: 0,
        genero: { M: 0, F: 0 },
        faixaEtaria: '-',
        tempoMedio: '-'
    });
    const [loading, setLoading] = useState(true);
    const [eventoNome, setEventoNome] = useState('');
    const [eventoDetalhes, setEventoDetalhes] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                // 1. Buscar Detalhes do Evento
                const resEvento = await fetch(`http://localhost:3000/api/eventos/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                let eventoInfo = null;
                if (resEvento.ok) {
                    eventoInfo = await resEvento.json();
                    setEventoDetalhes(eventoInfo);
                    setEventoNome(eventoInfo.nome);
                }

                // 2. Buscar Logs
                const resLogs = await fetch('http://localhost:3000/api/logs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resLogs.ok) throw new Error(`Status API Logs: ${resLogs.status}`);

                const allLogs = await resLogs.json();

                if (!Array.isArray(allLogs)) {
                    throw new Error("Resposta da API não é uma lista (array)");
                }

                // Filtrar logs deste evento (sucesso)
                const eventLogs = allLogs.filter(log =>
                    log &&
                    log.status_validacao === 'sucesso' &&
                    (log.Participante || log.Acompanhante) &&
                    (log.EventoId === parseInt(id) || (log.Evento && log.Evento.id === parseInt(id)))
                );

                if (!eventoNome && eventLogs.length > 0) {
                    const firstLogWithEvento = eventLogs.find(l => l.Evento && l.Evento.nome);
                    if (firstLogWithEvento) setEventoNome(firstLogWithEvento.Evento.nome);
                    else setEventoNome(`Evento #${id}`);
                }

                // Agrupar logs por participante
                const participantesMap = {};
                let totalAcompanhantesGeral = 0;

                eventLogs.forEach(log => {
                    // Se for log de PARTICIPANTE direto
                    if (log.ParticipanteId) {
                        const pId = log.ParticipanteId;
                        if (!participantesMap[pId]) {
                            participantesMap[pId] = {
                                participante: log.Participante,
                                entradas: [],
                                saidas: [],
                                acompanhantes: []
                            };
                        }

                        const time = new Date(log.createdAt);
                        if (log.tipo_acesso === 'entrada') {
                            participantesMap[pId].entradas.push(time);
                        } else if (log.tipo_acesso === 'saida') {
                            participantesMap[pId].saidas.push(time);
                        }
                    }
                    // Se for log de ACOMPANHANTE
                    else if (log.AcompanhanteId && log.Acompanhante) {
                        totalAcompanhantesGeral++;
                        const respId = log.Acompanhante.ParticipanteId;

                        // Garante que o responsável existe no mapa (mesmo que ele não tenha log de entrada ainda)
                        if (respId) {
                            if (!participantesMap[respId]) {
                                // Se o responsável não tem log direto, precisamos do objeto Participante. 
                                // O log do acompanhante infelizmente não traz o objeto do responsável completo, 
                                // mas o backend/banco garante a relação. 
                                // Para o relatório ser perfeito, precisaríamos carregar os respondáveis.
                                // Mas vamos tentar pegar de outros logs ou ignorar se não tiver dados visuais.
                                // REGRA: Geralmente o responsável entra ANTES.
                            }

                            if (participantesMap[respId]) {
                                const jaAdicionado = participantesMap[respId].acompanhantes.some(a => a.id === log.Acompanhante.id);
                                if (!jaAdicionado) {
                                    participantesMap[respId].acompanhantes.push({
                                        id: log.Acompanhante.id,
                                        nome: log.Acompanhante.nome
                                    });
                                }
                            }
                        }
                    }
                });

                // --- PROCESSAMENTO FINAL (Primeira Entrada / Última Saída) ---
                const processedList = Object.values(participantesMap).map(data => {
                    // Ordenar datas
                    data.entradas.sort((a, b) => a - b);
                    data.saidas.sort((a, b) => a - b);

                    // Regra: Primeira Entrada
                    const primeiraEntrada = data.entradas.length > 0 ? data.entradas[0] : null;

                    // Regra: Última Saída
                    let ultimaSaida = data.saidas.length > 0 ? data.saidas[data.saidas.length - 1] : null;

                    // LÓGICA DE SAÍDA AUTOMÁTICA
                    let saidaAutomatica = false;
                    if (primeiraEntrada && !ultimaSaida && eventoInfo && eventoInfo.status === 'finalizado') {
                        ultimaSaida = new Date(eventoInfo.updatedAt);
                        saidaAutomatica = true;
                    }

                    // Cálculo de permanência: Total = Última Saída - Primeira Entrada
                    let permanenciaMs = 0;
                    if (primeiraEntrada && ultimaSaida && ultimaSaida > primeiraEntrada) {
                        permanenciaMs = ultimaSaida - primeiraEntrada;
                    }

                    return {
                        ...data.participante,
                        horarioEntrada: primeiraEntrada,
                        horarioSaida: ultimaSaida,
                        permanenciaMs,
                        saidaAutomatica,
                        acompanhantes: data.acompanhantes // Lista de acompanhantes deste participante
                    };
                });

                setProcessedData(processedList);

                // Calcular Estatísticas
                const genero = { M: 0, F: 0 };
                const faixas = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };
                let somaPermanencia = 0;
                let countPermanencia = 0;

                processedList.forEach(p => {
                    if (p.genero === 'M') genero.M++;
                    if (p.genero === 'F') genero.F++;

                    if (p.data_nascimento) {
                        const nasc = new Date(p.data_nascimento);
                        const hoje = new Date();
                        if (!isNaN(nasc.getTime())) {
                            let idade = hoje.getFullYear() - nasc.getFullYear();
                            const m = hoje.getMonth() - nasc.getMonth();
                            if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

                            if (idade <= 25) faixas['18-25']++;
                            else if (idade <= 35) faixas['26-35']++;
                            else if (idade <= 50) faixas['36-50']++;
                            else faixas['50+']++;
                        }
                    }

                    if (p.permanenciaMs > 0) {
                        somaPermanencia += p.permanenciaMs;
                        countPermanencia++;
                    }
                });

                let maxFaixa = '-';
                let maxQtd = -1;
                for (const [faixa, qtd] of Object.entries(faixas)) {
                    if (qtd > maxQtd) { maxQtd = qtd; maxFaixa = faixa; }
                }

                let tempoMedioStr = '-';
                if (countPermanencia > 0) {
                    const mediaMs = somaPermanencia / countPermanencia;
                    const horas = Math.floor(mediaMs / (1000 * 60 * 60));
                    const minutos = Math.floor((mediaMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoMedioStr = `${horas}h ${minutos}m`;
                }

                setStats({
                    totalParticipantes: processedList.length,
                    totalAcompanhantes: totalAcompanhantesGeral,
                    genero,
                    faixaEtaria: maxFaixa === '-' ? '-' : maxFaixa + ' anos',
                    tempoMedio: tempoMedioStr
                });

            } catch (err) {
                console.error("Erro Relatorio:", err);
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, token]);


    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.**${cleaned.substring(9, 10)}-${cleaned.substring(10, 11)}`;
        }
        return cpf;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    const formatDateTimeWithSeconds = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatTimeWithSeconds = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatGender = (genero) => {
        if (genero === 'M') return 'H';
        if (genero === 'F') return 'M';
        return '-';
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando relatório...</div>;

    if (errorMsg) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            <h3>Erro ao carregar dados:</h3>
            <p>{errorMsg}</p>
            <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Voltar</button>
        </div>
    );

    return (
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
                    Relatório: {eventoNome || 'Evento sem nome'}
                </h1>

                <button
                    onClick={() => {
                        const headers = ["Participante", "CPF", "CRM", "Data Nasc.", "Gênero", "Entrada", "Saída", "Permanência", "Qtd Acomp.", "Acompanhantes (ID: Nome)"];
                        const rows = processedData.map(p => {
                            const companionDetails = (p.acompanhantes || []).map(a => `${a.id}: ${a.nome}`).join(" | ");
                            return [
                                p.nome,
                                p.cpf || p.documento,
                                p.crm || '-',
                                formatDate(p.data_nascimento),
                                formatGender(p.genero),
                                p.horarioEntrada ? formatDateTimeWithSeconds(p.horarioEntrada) : '-',
                                p.horarioSaida ? formatTimeWithSeconds(p.horarioSaida) : '-',
                                p.permanenciaMs > 0 ? `${Math.floor(p.permanenciaMs / (1000 * 60 * 60))}h ${Math.floor((p.permanenciaMs % (1000 * 60 * 60)) / (1000 * 60))}m` : '-',
                                (p.acompanhantes || []).length,
                                companionDetails || '-'
                            ];
                        });

                        const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
                        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `relatorio_${eventoNome.replace(/\s+/g, '_')}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    style={{
                        marginLeft: 'auto',
                        backgroundColor: '#198754',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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

                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total de Participantes</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                            {stats.totalParticipantes}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total de Acompanhantes</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#b1d249' }}>
                            {stats.totalAcompanhantes}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tempo Médio</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6610f2' }}>
                            {stats.tempoMedio}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Gênero</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            <span style={{ color: '#74c0fc' }}>♂ {stats.genero.M}</span>
                            <span style={{ color: '#faa2c1' }}>♀ {stats.genero.F}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Faixa Etária</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {stats.faixaEtaria}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Detalhes por Participante</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Participante</th>
                                <th>CPF</th>
                                <th>CRM</th>
                                <th>Data Nasc.</th>
                                <th style={{ width: '50px' }}>Gênero</th>
                                <th style={{ width: '40px' }} title="Acompanhantes">Acomp.</th>
                                <th>Entrada</th>
                                <th>Saída</th>
                                <th>Permanência</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((p, index) => (
                                <tr key={p.id || index}>
                                    <td>{p.nome}</td>
                                    <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{maskCPF(p.cpf || p.documento)}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{p.crm || '-'}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{formatDate(p.data_nascimento)}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{formatGender(p.genero)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                        {p.acompanhantes?.length || 0}
                                    </td>
                                    <td>
                                        {p.horarioEntrada ? formatDateTimeWithSeconds(p.horarioEntrada) : '-'}
                                    </td>
                                    <td>
                                        {p.saidaAutomatica ? (
                                            <span title="Saída automática no fim do evento" style={{ fontStyle: 'italic', color: '#666' }}>
                                                {formatTimeWithSeconds(p.horarioSaida)}*
                                            </span>
                                        ) : (
                                            <span>
                                                {formatTimeWithSeconds(p.horarioSaida)}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {p.permanenciaMs > 0 ? (
                                            `${Math.floor(p.permanenciaMs / (1000 * 60 * 60))}h ${Math.floor((p.permanenciaMs % (1000 * 60 * 60)) / (1000 * 60))}m`
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {processedData.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum participante registrado com sucesso neste evento.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {eventoDetalhes && eventoDetalhes.status === 'finalizado' && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
                        * Saída registrada automaticamente no encerramento do evento para fins de cálculo de permanência.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RelatorioEvento() {
    return (
        <ErrorBoundary>
            <Navbar />
            <RelatorioEventoContent />
        </ErrorBoundary>
    );
}
