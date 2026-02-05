import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';

const API_URL = 'http://localhost:3000/api';

function ControleAcesso() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [evento, setEvento] = useState(null);
  const [lastLogId, setLastLogId] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [stats, setStats] = useState({ faixaPredominante: '-', generoPredominante: '-', generoPercent: 0, mediaIdade: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [simulating, setSimulating] = useState(false);
  const audioRef = useRef(new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3')); // Som de exemplo
  const modalTimeoutRef = useRef(null);

  // Modal Manual State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDoc, setManualDoc] = useState('');
  const manualInputRef = useRef(null);
  const [manualMode, setManualMode] = useState('search'); // 'search' | 'create'
  const [newParticipant, setNewParticipant] = useState({ nome: '', documento: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' });

  // Companion States
  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [responsavelId, setResponsavelId] = useState(null);
  const [responsibleSearchTerm, setResponsibleSearchTerm] = useState('');
  const [responsibleResults, setResponsibleResults] = useState([]);
  const [selectedResponsible, setSelectedResponsible] = useState(null); // Para mostrar o nome na tela

  // Modal Finish State
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [messageModal, setMessageModal] = useState({ open: false, title: '', message: '', type: 'info', onOk: null });

  const showMessage = (title, message, type = 'info', onOk = null) => {
    setMessageModal({ open: true, title, message, type, onOk });
  };

  useEffect(() => {
    // Buscar evento ativo
    const fetchEvento = async () => {
      try {
        const res = await fetch(`${API_URL}/evento-ativo`);
        const data = await res.json();
        if (data) setEvento(data);
        else {
          showMessage("Aviso", "Nenhum evento ativo. Você será redirecionado.", "info", () => navigate('/'));
        }
      } catch (e) { console.error(e); }
    };
    fetchEvento();

    const fetchLogs = async () => {
      // Só buscar logs se houver evento ativo
      if (!evento) return;

      try {
        const res = await fetch(`${API_URL}/logs`);
        const data = await res.json();

        // Filtrar apenas logs do evento ativo atual
        const filteredLogs = data.filter(log => log.EventoId === evento.id);

        if (filteredLogs && filteredLogs.length > 0) {
          setLogs(filteredLogs);

          const latest = filteredLogs[0];
          // Se for a primeira carga (lastLogId === 0), apenas inicializamos o ID
          // sem disparar o modal visual/sonoro.
          if (lastLogId === 0) {
            setLastLogId(latest.id);
          } else if (latest.id > lastLogId) {
            // Se o ID for maior que o anterior, é um novo acesso em tempo real
            setLastLogId(latest.id);
            if (latest.status_validacao === 'sucesso' || latest.status_validacao === 'nao_encontrado') {
              showModal(latest);
            }
          }
        } else {
          setLogs([]);
        }

        // Cálculos Estatísticos (Participantes Presentes Únicos) - usar filteredLogs
        const presentesMap = new Map();
        filteredLogs.forEach(log => {
          if (log.status_validacao === 'sucesso' && log.Participante) {
            // Não incluir acompanhantes nas estatísticas (eles não têm dados demográficos completos)
            if (log.Participante.documento !== 'Acompanhante') {
              if (!presentesMap.has(log.Participante.id)) {
                presentesMap.set(log.Participante.id, log.Participante);
              }
            }
          }
        });

        const participantes = Array.from(presentesMap.values());
        let totalM = 0, totalF = 0;
        let idades = [];

        // Faixas: 18-25, 26-35, 36-50, 50+
        let faixas = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0 };

        participantes.forEach(p => {
          if (p.genero === 'M') totalM++;
          if (p.genero === 'F') totalF++;

          if (p.data_nascimento) {
            const nasc = new Date(p.data_nascimento);
            const hoje = new Date();
            let idade = hoje.getFullYear() - nasc.getFullYear();
            const m = hoje.getMonth() - nasc.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
              idade--;
            }
            idades.push(idade);

            if (idade <= 25) faixas['18-25']++;
            else if (idade <= 35) faixas['26-35']++;
            else if (idade <= 50) faixas['36-50']++;
            else faixas['50+']++;
          }
        });

        // Determinar predominantes
        const generoPredominante = totalM > totalF ? 'Masculino' : (totalF > totalM ? 'Feminino' : 'Equilibrado');
        const percentMale = participantes.length > 0 ? Math.round((totalM / participantes.length) * 100) : 0;
        const percentFemale = participantes.length > 0 ? Math.round((totalF / participantes.length) * 100) : 0;

        // Percentual predominante antigo (mantido para compatibilidade se necessário, mas não usado na barra)
        const generoPercent = participantes.length > 0 ? Math.round((Math.max(totalM, totalF) / participantes.length) * 100) : 0;

        let faixaPredominante = '-';
        let maxFaixa = -1;
        for (const [faixa, qtd] of Object.entries(faixas)) {
          if (qtd > maxFaixa) {
            maxFaixa = qtd;
            faixaPredominante = faixa + ' anos';
          }
        }
        if (participantes.length === 0) faixaPredominante = '-';

        setStats({
          faixaPredominante,
          generoPredominante,
          generoPercent,
          percentMale,
          percentFemale,
          mediaIdade: idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0
        });
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
      }
    };

    // Polling a cada 2 segundos
    const interval = setInterval(fetchLogs, 2000);
    fetchLogs(); // Primeira chamada

    return () => clearInterval(interval);
  }, [lastLogId, navigate, evento]);

  // Simulação Loop
  useEffect(() => {
    let simInterval;
    if (simulating) {
      simInterval = setInterval(async () => {
        try {
          await fetch(`${API_URL}/simulate`, { method: 'POST' });
        } catch (e) { console.error("Erro simulação", e); }
      }, 7000); // A cada 7 segundos gera um log
    }
    return () => clearInterval(simInterval);
  }, [simulating]);

  useEffect(() => {
    if (manualModalOpen && manualInputRef.current) {
      setTimeout(() => manualInputRef.current.focus(), 100);
    }
  }, [manualModalOpen]);

  const handleManualEntryClick = () => {
    setManualDoc('');
    setManualMode('search');
    setNewParticipant({ nome: '', documento: '', genero: 'Outro' });
    setManualModalOpen(true);
  };

  const submitManualEntry = async () => {
    if (!manualDoc) return;
    // Don't close modal yet

    try {
      const res = await fetch(`${API_URL}/manual-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: manualDoc })
      });
      const data = await res.json();

      if (data.success) {
        setManualModalOpen(false);
        const fakeLog = {
          status_validacao: data.status,
          Participante: data.participante || { nome: 'Desconhecido', documento: manualDoc }
        };
        showModal(fakeLog);
      } else if (data.not_found) {
        // Switch to create mode
        setManualMode('create');
        setNewParticipant({ ...newParticipant, documento: manualDoc });
      } else {
        // Generic error
        showMessage("Erro", data.msg || "Erro ao processar entrada manual", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro de comunicação com servidor", "error");
    }
  };

  const submitCreateEntry = async () => {
    if (!newParticipant.nome || !newParticipant.cpf || !newParticipant.data_nascimento) {
      showMessage("Aviso", "Preencha Nome, CPF e Data de Nascimento", "info");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cadastrar-entrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipant)
      });
      const data = await res.json();

      if (data.success) {
        setManualModalOpen(false);
        setManualMode('search');
        setNewParticipant({ nome: '', documento: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' });
        showMessage("Sucesso", "Participante cadastrado com sucesso!", "success");
        const fakeLog = {
          status_validacao: 'sucesso',
          Participante: data.participante
        };
        showModal(fakeLog);
      } else {
        showMessage("Erro", data.msg || "Erro ao cadastrar", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro ao conectar", "error");
    }
  };



  const handleSearchResponsible = async (term) => {
    setResponsibleSearchTerm(term);
    if (term.length < 3) {
      setResponsibleResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/participantes/busca?q=${term}`);
      const data = await res.json();
      setResponsibleResults(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectResponsible = (p) => {
    setResponsavelId(p.id);
    setSelectedResponsible(p);
    setResponsibleResults([]);
    setResponsibleSearchTerm(''); // Limpa busca
  };

  const resetCompanionModal = () => {
    setCompanionModalOpen(false);
    setCompanionName('');
    setResponsavelId(null);
    setSelectedResponsible(null);
    setResponsibleSearchTerm('');
    setResponsibleResults([]);
  };

  const submitCompanion = async () => {
    if (!companionName || !responsavelId) return;

    try {
      const res = await fetch(`${API_URL}/registrar-acompanhante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: companionName, responsavel_id: responsavelId })
      });
      const data = await res.json();

      if (data.success) {
        resetCompanionModal();
        showMessage("Sucesso", "Acompanhante registrado com sucesso!", "success");
        showModal({
          status_validacao: 'sucesso',
          Participante: { nome: companionName, documento: 'Acompanhante' },
          Responsavel: selectedResponsible
        });
      } else {
        showMessage("Erro", data.msg || "Erro ao registrar acompanhante", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro na conexão", "error");
    }
  };

  const handleFinishClick = () => {
    if (!evento) return;
    setFinishModalOpen(true);
  };

  const confirmFinishEvent = async () => {
    setFinishModalOpen(false);
    if (!evento) return;

    try {
      const res = await fetch(`${API_URL}/eventos/${evento.id}/finalizar`, { method: 'POST' });
      if (res.ok) {
        // Pequeno delay para visualização
        showMessage("Sucesso", "Evento finalizado com sucesso!", "success", () => navigate('/'));
      } else {
        showMessage("Erro", "Erro ao finalizar evento.", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro de conexão.", "error");
    }
  };

  const showModal = (log) => {
    // Limpar timeout anterior se existir
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }

    setModalData(log);
    // Tocar som
    if (audioRef.current) audioRef.current.play().catch(e => console.log(e));

    // Manter dados visíveis por 6 segundos
    modalTimeoutRef.current = setTimeout(() => {
      setModalData(null);
      modalTimeoutRef.current = null;
    }, 6000);
  };

  // Helper para formatar nome: "Kelvin Higino da Silva" -> "Kelvin H. d. S."
  const formatName = (fullName) => {
    if (!fullName || fullName === 'Desconhecido') return 'Desconhecido';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0];

    // Primeiro nome
    let formatted = parts[0];
    // Iniciais dos restantes
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].length > 2) { // Ignora 'da', 'de' curtos se quiser, ou abrevia tudo
        formatted += ` ${parts[i].charAt(0)}.`;
      }
    }
    return formatted;
  };

  // Helper para formatar data (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Helper para renderizar o painel direito
  const renderAccessPanel = () => {
    if (!modalData) {
      return (
        <div className="access-panel waiting" style={{ padding: '2rem', justifyContent: 'center' }}>
          <div className="access-photo-large" style={{ width: '120px', height: '120px', fontSize: '3rem', margin: '0 auto 1.5rem' }}>
            <span role="img" aria-label="fingerprint">👆</span>
          </div>
          <h2 className="access-title" style={{ fontSize: '1.5rem' }}>Aguardando Validação</h2>
          <p className="access-subtitle" style={{ fontSize: '1rem', marginBottom: '2rem' }}>Posicione seu dedo no leitor biométrico</p>

          <div style={{ opacity: 0.15, transform: 'scale(1.5)', color: 'var(--text-primary)' }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94.28 0 .5.22.5.5s-.22.5-.5.5c-1.7 0-3.08-1.32-3.08-2.94 0-1.07-.93-1.94-2.08-1.94-1.15 0-2.08.87-2.08 1.94 0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z" />
            </svg>
          </div>
        </div>
      );
    }

    const isSuccess = modalData.status_validacao === 'sucesso';
    const statusClass = isSuccess ? 'success' : 'error';
    const participante = modalData.Participante || {};

    return (
      <div className={`access-panel ${statusClass}`} style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="access-photo-large" style={{
          width: '120px',
          height: '120px',
          fontSize: '2.5rem',
          margin: '0 auto 1rem',
          borderWidth: '4px'
        }}>
          {participante.nome ? participante.nome.charAt(0) : '!'}
        </div>

        {isSuccess ? (
          <>
            <h2 className="access-title" style={{ color: 'var(--success-color)', fontSize: '1.3rem', marginBottom: '0.5rem', lineHeight: '1.3', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              Bem-vindo(a), {participante.nome}!
              <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 'normal', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '3px' }}>
                {participante.genero === 'M' ? 'H' : participante.genero === 'F' ? 'M' : ''}
              </span>
            </h2>
            <p className="access-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Acesso autorizado com sucesso</p>

            <div className="info-grid" style={{ gap: '0.6rem', width: '100%' }}>
              <div className="info-item" style={{ padding: '0.5rem', textAlign: 'left' }}>
                <span className="info-label" style={{ fontSize: '0.7rem' }}>CPF</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{participante.cpf || participante.documento || '-'}</span>
              </div>
              <div className="info-item" style={{ padding: '0.5rem', textAlign: 'left' }}>
                <span className="info-label" style={{ fontSize: '0.7rem' }}>CRM</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{participante.crm || '-'}</span>
              </div>
              <div className="info-item" style={{ padding: '0.5rem', textAlign: 'left' }}>
                <span className="info-label" style={{ fontSize: '0.7rem' }}>Data de Nascimento</span>
                <span className="info-value" style={{ fontSize: '0.95rem' }}>
                  {participante.data_nascimento ? formatDate(participante.data_nascimento) : '-'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--success-color)',
                animation: 'progressBar 6s linear forwards',
                width: '100%'
              }}></div>
            </div>

          </>
        ) : (
          <>
            <h2 className="access-title" style={{ color: 'var(--error-color)', fontSize: '1.5rem' }}>Biometria não reconhecida</h2>
            <p className="access-subtitle" style={{ fontSize: '1rem' }}>Biometria não identificada</p>
            <div className="info-grid" style={{ gap: '1rem', width: '100%' }}>
              <div className="info-item" style={{ padding: '0.8rem' }}>
                <span className="info-label">Status</span>
                <span className="info-value" style={{ color: 'var(--error-color)', fontSize: '1.1rem' }}>Não Cadastrado</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar>
        <button
          onClick={() => setSimulating(!simulating)}
          style={{
            backgroundColor: simulating ? '#e1e4e8' : 'rgba(255,255,255,0.2)',
            border: '1px solid white',
            color: simulating ? 'var(--text-primary)' : 'white',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            marginRight: '1rem'
          }}
        >
          {simulating ? '⏹ Parar Simulação' : '▶ Simular Acesso'}
        </button>
        <button
          onClick={handleFinishClick}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid white',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}
        >
          Finalizar Evento
        </button>
      </Navbar>

      <div className="main-layout">
        {/* Coluna Esquerda: Dashboard e Tabela */}
        <div className="left-column">
          <div className="event-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.2rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
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
              {evento ? evento.nome : 'Carregando Evento...'}
            </h1>
            {evento && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {evento.data_inicio && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong>Data:</strong> {formatDate(evento.data_inicio)}
                  </span>
                )}
                {evento.hora_inicio && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong>Horário:</strong> {evento.hora_inicio}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="card">
              <h2>Total de Entradas</h2>
              <div className="stat-value">{logs.filter(l => l.status_validacao === 'sucesso').length}</div>

              {/* Barra de Participantes vs Acompanhantes */}
              {logs.length > 0 && (() => {
                const totalSuccess = logs.filter(l => l.status_validacao === 'sucesso').length;
                const companions = logs.filter(l => l.status_validacao === 'sucesso' && l.Participante?.documento === 'Acompanhante').length;
                const participants = totalSuccess - companions;
                const percentParticipants = totalSuccess > 0 ? Math.round((participants / totalSuccess) * 100) : 0;
                const percentCompanions = totalSuccess > 0 ? Math.round((companions / totalSuccess) * 100) : 0;

                return (
                  <>
                    <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#eee', position: 'relative', marginTop: '0.5rem' }}>
                      <div style={{ width: `${percentParticipants}%`, backgroundColor: '#00995D', height: '100%', transition: 'width 0.5s' }} title={`Participantes: ${percentParticipants}%`}></div>
                      <div style={{ width: '2px', backgroundColor: '#fff', zIndex: 1 }}></div>
                      <div style={{ width: `${percentCompanions}%`, backgroundColor: '#b1d249', height: '100%', flex: 1, transition: 'width 0.5s' }} title={`Acompanhantes: ${percentCompanions}%`}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                      <span style={{ color: '#00995D', fontWeight: 'bold' }}>👤 {percentParticipants}%</span>
                      <span style={{ color: '#b1d249', fontWeight: 'bold' }}>👥 {percentCompanions}%</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="card">
              <h2>Participantes Presentes</h2>
              <div className="stat-value">{logs.filter(l => l.status_validacao === 'sucesso').length}</div>
            </div>
            <div className="card">
              <h2>Acompanhantes Presentes</h2>
              <div className="stat-value">{logs.filter(l => l.status_validacao === 'sucesso' && l.Participante?.documento === 'Acompanhante').length}</div>
            </div>
            <div className="card">
              <h2>Faixa Etária Principal</h2>
              <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.4rem' }}>{stats.faixaPredominante}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Média: {stats.mediaIdade} anos</div>
            </div>
            <div className="card">
              <h2>Gênero Predominante</h2>
              <div className="stat-value" style={{ fontSize: '1.5rem', marginTop: '0.4rem', marginBottom: '0.5rem' }}>{stats.generoPredominante}</div>

              {/* Barra de Gênero */}
              <div style={{ display: 'flex', width: '100%', height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#eee', position: 'relative' }}>
                <div style={{ width: `${stats.percentMale !== undefined && stats.percentMale !== 0 ? stats.percentMale : 50}%`, backgroundColor: '#74c0fc', height: '100%', transition: 'width 0.5s' }} title={`Homens: ${stats.percentMale}%`}></div>

                {/* Separador Central */}
                <div style={{ width: '2px', backgroundColor: '#fff', zIndex: 1 }}></div>

                <div style={{ width: `${stats.percentFemale !== undefined && stats.percentFemale !== 0 ? stats.percentFemale : 50}%`, backgroundColor: '#faa2c1', height: '100%', flex: 1, transition: 'width 0.5s' }} title={`Mulheres: ${stats.percentFemale}%`}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                <span style={{ color: '#74c0fc', fontWeight: 'bold', fontSize: '1.2rem' }}>♂ {stats.percentMale ?? 0}%</span>
                <span style={{ color: '#faa2c1', fontWeight: 'bold', fontSize: '1.2rem' }}>♀ {stats.percentFemale ?? 0}%</span>
              </div>
            </div>
            <div className="card">
              <h2>Biometrias Não Localizadas</h2>
              <div className="stat-value" style={{ color: 'var(--error-color)' }}>
                {logs.filter(l => l.status_validacao === 'nao_encontrado').length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Lista de Entrada</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleManualEntryClick}
                style={{
                  backgroundColor: 'var(--accent-color)',
                  border: 'none',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <span>+</span> Registrar Participante
              </button>
              <button
                onClick={() => {
                  if (evento && evento.permitir_acompanhantes) {
                    setCompanionModalOpen(true);
                    setResponsavelId(null);
                    setSelectedResponsible(null);
                    setResponsibleSearchTerm('');
                  } else {
                    showMessage("Aviso", "Este evento não permite acompanhantes.", "info");
                  }
                }}
                style={{
                  backgroundColor: 'var(--accent-color)',
                  border: 'none',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <span>+</span> Registrar Acompanhante
              </button>
            </div>
          </div>
          <div className="table-filter" style={{ marginBottom: '0' }}>
            <input
              type="text"
              placeholder="Localizar por Nome, CPF ou CRM..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px 6px 0 0',
                border: '1px solid var(--border-color)',
                borderBottom: 'none',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div className="table-container" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none', maxHeight: '400px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Horário</th>
                  <th>Participante</th>
                  <th style={{ width: '18%' }}>CRM</th>
                  <th style={{ width: '12%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .filter(log => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const participante = log.Participante || {};
                    const nome = participante.nome || 'Desconhecido';
                    const documento = participante.documento || '';
                    return nome.toLowerCase().includes(term) || documento.toLowerCase().includes(term);
                  })
                  .map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td>{formatName(log.Participante ? log.Participante.nome : 'Desconhecido')}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {log.Participante?.crm || '-'}
                      </td>
                      <td>
                        <span className={`badge badge-${log.status_validacao === 'sucesso' ? 'success' : 'error'}`}>
                          {log.status_validacao.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aguardando registros...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna Direita: Painel de Validação */}
        <div className="right-column">
          {renderAccessPanel()}
        </div>
      </div>

      {/* Modal Manual */}
      <div className={`modal-overlay ${manualModalOpen ? 'open' : ''}`} onClick={() => { setManualModalOpen(false); setManualMode('search'); }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          {manualMode === 'search' ? (
            <>
              <div className="modal-header">Localizar Pessoa</div>
              <input
                ref={manualInputRef}
                type="text"
                className="modal-input"
                placeholder="Digite Nome, CPF ou CRM"
                value={manualDoc}
                onChange={e => setManualDoc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitManualEntry()}
              />
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setManualModalOpen(false); setManualMode('search'); }}>Cancelar</button>
                <button className="btn-primary" onClick={submitManualEntry}>Confirmar</button>
              </div>
            </>
          ) : (
            <>
              <div className="modal-header">Cadastrar Novo Participante</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Nome Completo *"
                  value={newParticipant.nome}
                  onChange={e => setNewParticipant({ ...newParticipant, nome: e.target.value })}
                />
                <input
                  type="text"
                  className="modal-input"
                  placeholder="CPF *"
                  value={newParticipant.cpf}
                  onChange={e => setNewParticipant({ ...newParticipant, cpf: e.target.value, documento: e.target.value })}
                />
                <input
                  type="text"
                  className="modal-input"
                  placeholder="CRM (opcional)"
                  value={newParticipant.crm}
                  onChange={e => setNewParticipant({ ...newParticipant, crm: e.target.value })}
                />
                <input
                  type="date"
                  className="modal-input"
                  placeholder="Data de Nascimento *"
                  value={newParticipant.data_nascimento}
                  onChange={e => setNewParticipant({ ...newParticipant, data_nascimento: e.target.value })}
                />
                <select
                  className="modal-input"
                  value={newParticipant.genero}
                  onChange={e => setNewParticipant({ ...newParticipant, genero: e.target.value })}
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setManualMode('search'); setNewParticipant({ nome: '', documento: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' }); }}>Voltar</button>
                <button className="btn-primary" onClick={submitCreateEntry}>Cadastrar e Registrar Entrada</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Finalizar */}
      < div className={`modal-overlay ${finishModalOpen ? 'open' : ''}`} onClick={() => setFinishModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div className="modal-header" style={{ color: 'var(--error-color)' }}>Finalizar Evento?</div>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            Tem certeza que deseja encerrar <strong>{evento?.nome}</strong>? <br />
            Essa ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setFinishModalOpen(false)}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={confirmFinishEvent}
              style={{ backgroundColor: 'var(--error-color)' }}
            >
              Finalizar Evento
            </button>
          </div>
        </div>
      </div >

      {/* Modal Novo Acompanhante */}
      < div className={`modal-overlay ${companionModalOpen ? 'open' : ''}`} onClick={resetCompanionModal} >
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px', maxWidth: '95%' }}>
          <h2 className="modal-header">Adicionar Acompanhante</h2>

          {!responsavelId ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#666' }}>Primeiro, localize o responsável:</p>
              <input
                type="text"
                className="modal-input"
                autoFocus
                placeholder="Buscar Responsável (Nome ou CPF/CRM)"
                value={responsibleSearchTerm}
                onChange={e => handleSearchResponsible(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              {responsibleResults.length > 0 && (
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: '#fff',
                  marginTop: '0.5rem'
                }}>
                  {responsibleResults.map(r => (
                    <div
                      key={r.id}
                      onClick={() => selectResponsible(r)}
                      style={{
                        padding: '0.8rem',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ fontWeight: 600 }}>{r.nome}</span>
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>{r.documento}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{
                background: '#e6fffa',
                border: '1px solid #b2f5ea',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#2c7a7b' }}>Responsável: {selectedResponsible?.nome}</p>
                <button
                  onClick={() => { setResponsavelId(null); setSelectedResponsible(null); }}
                  style={{ background: 'none', border: 'none', color: '#2c7a7b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}
                >
                  Alterar
                </button>
              </div>

              <input
                type="text"
                className="modal-input"
                autoFocus
                placeholder="Nome Completo do Acompanhante"
                value={companionName}
                onChange={e => setCompanionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitCompanion()}
              />
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={resetCompanionModal}>Cancelar</button>
            {responsavelId && (
              <button className="btn-primary" onClick={submitCompanion}>Confirmar Entrada</button>
            )}
          </div>
        </div>
      </div >

      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        onConfirm={messageModal.onOk}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />
    </>
  );
}

export default ControleAcesso;
