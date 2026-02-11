import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:3000/api';

function ControleAcesso() {
  const navigate = useNavigate();
  const { token } = useAuth();
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
  const [manualSearchResults, setManualSearchResults] = useState([]); // Novos resultados da busca manual
  const [selectedManualParticipant, setSelectedManualParticipant] = useState(null); // Para confirmação antes de registrar


  // Companion States
  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [responsavelId, setResponsavelId] = useState(null);
  const [responsibleSearchTerm, setResponsibleSearchTerm] = useState('');
  const [responsibleResults, setResponsibleResults] = useState([]);
  const [selectedResponsible, setSelectedResponsible] = useState(null); // Para mostrar o nome na tela

  // Modal Finish State
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishConfirmText, setFinishConfirmText] = useState('');
  const [messageModal, setMessageModal] = useState({ open: false, title: '', message: '', type: 'info', onOk: null });
  const [bridgeStatus, setBridgeStatus] = useState('disconnected'); // 'connected', 'disconnected' (connection to WS)
  const [scannerStatus, setScannerStatus] = useState('unknown'); // 'connected', 'disconnected' (device status)
  const [biometricQualityMsg, setBiometricQualityMsg] = useState(''); // Mensagem de feedback de qualidade

  const showMessage = (title, message, type = 'info', onOk = null) => {
    setMessageModal({ open: true, title, message, type, onOk });
  };

  useEffect(() => {
    // Buscar evento ativo
    const fetchEvento = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/evento-ativo`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
      if (!evento || !token) return;

      try {
        const res = await fetch(`${API_URL}/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
        const firstLogMap = new Map(); // Map<ParticipanteId, FirstLog>

        // Ordenar logs por data ASC para encontrar a primeira entrada
        const sortedLogs = [...filteredLogs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        sortedLogs.forEach(log => {
          if (log.status_validacao === 'sucesso' && log.Participante) {
            const pid = log.Participante.id;
            if (!presentesMap.has(pid)) {
              presentesMap.set(pid, log.Participante);
              firstLogMap.set(pid, log); // Guarda o log da primeira entrada
            }
          }
        });

        const participantes = Array.from(presentesMap.values());

        // Contar Entradas Manuais (baseado na primeira entrada)
        let manualCount = 0;
        firstLogMap.forEach(log => {
          // Se o device_id NÃO for 'futronic_web', consideramos manual (inclui 'manual_entry_web', 'new_entry_web', etc)
          if (log.device_id !== 'futronic_web') {
            manualCount++;
          }
        });

        // Acompanhantes
        const totalAcompanhantes = filteredLogs.filter(l => l.status_validacao === 'sucesso' && l.AcompanhanteId).length;

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

        // Percentual predominante antigo
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
          mediaIdade: idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0,
          manualCount,
          totalAcompanhantes,
          totalParticipantesUnicos: participantes.length
        });
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
      }
    };

    // Polling a cada 2 segundos
    const interval = setInterval(fetchLogs, 2000);
    fetchLogs(); // Primeira chamada

    return () => clearInterval(interval);
  }, [lastLogId, navigate, evento, token]);

  // Simulação Loop
  useEffect(() => {
    let simInterval;
    if (simulating) {
      simInterval = setInterval(async () => {
        try {
          await fetch(`${API_URL}/simulate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) { console.error("Erro simulação", e); }
      }, 7000); // A cada 7 segundos gera um log
    }
    return () => clearInterval(simInterval);
  }, [simulating]);

  // WebSocket Biometria
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const connectBridge = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      console.log('Tentando conectar ao Bridge...');
      const ws = new WebSocket('ws://localhost:4000');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Bridge conectada');
        setBridgeStatus('connected');
        ws.send('START_CAPTURE');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'IMAGE_DATA') {
            handleBiometricAttempt(data.image, data.width, data.height);
          } else if (data.type === 'STATUS') {
            console.log('Bridge Status:', data.message);
            if (data.status === 'low_quality') {
              setBiometricQualityMsg(data.message);
              setTimeout(() => setBiometricQualityMsg(''), 3000);
            }
          } else if (data.type === 'DEVICE_STATUS') {
            setScannerStatus(data.status); // 'connected' or 'disconnected'
            // Se reconectou o device, garante que está capturando
            if (data.status === 'connected') {
              ws.send('START_CAPTURE');
            }
          } else if (data.type === 'ERROR') {
            console.error('Bridge Error:', data.message);
            // showMessage("Erro no Leitor", data.message, "error"); // Opcional: pode ser irritante se for persistente
          }
        } catch (e) {
          console.error('Erro ao processar mensagem do bridge', e);
        }
      };

      ws.onclose = () => {
        console.log('Bridge desconectada. Tentando reconectar em 3s...');
        setBridgeStatus('disconnected');
        setScannerStatus('unknown');
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectBridge, 3000);
      };

      ws.onerror = (e) => {
        console.log('Erro na conexão WebSocket (Bridge pode estar offline).');
        if (ws.readyState === WebSocket.OPEN) ws.close();
      };
    };

    connectBridge();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        // Remove listener to avoid loop during unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  const handleBiometricAttempt = async (base64Image, width = 320, height = 480) => {
    try {
      const res = await fetch(`${API_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          template: base64Image,
          width: width || 320,
          height: height || 480,
          device_id: 'futronic_web'
        })
      });
      const data = await res.json();

      if (data.autorizado) {
        const fakeLog = {
          status_validacao: 'sucesso',
          Participante: data.participante
        };
        showModal(fakeLog);
      } else {
        // Se não autorizado, mostra erro no painel (div do leitor)
        const fakeLog = {
          status_validacao: 'falha',
          Participante: { nome: 'Não Identificado' }, // Objeto dummy para renderizar '!'
          mensagem: data.mensagem || "Biometria não reconhecida"
        };
        showModal(fakeLog);
      }
    } catch (e) {
      console.error("Erro ao enviar biometria", e);
    } finally {
      // Reiniciar captura após 2 segundos para dar tempo do usuário tirar o dedo
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('Reiniciando captura...');
          wsRef.current.send('START_CAPTURE');
        }
      }, 2000);
    }
  };

  // Efeito para focar no input quando abrir modal ou mudar modo
  useEffect(() => {
    if ((manualModalOpen && manualMode === 'search') || (companionModalOpen && !responsavelId)) {
      setTimeout(() => {
        if (manualInputRef.current) manualInputRef.current.focus();
      }, 100);
    }
  }, [manualModalOpen, manualMode, companionModalOpen, responsavelId]);

  // Função para buscar participantes para o modal MANUAL (entrada direta)
  const handleManualSearchInput = async (term) => {
    setManualDoc(term);
    if (term.length < 3) {
      setManualSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/participantes/busca?q=${term}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setManualSearchResults(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectManualParticipant = async (p) => {
    // Registra entrada direto com o ID selecionado
    try {
      const res = await fetch(`${API_URL}/manual-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participanteId: p.id })
      });
      const data = await res.json();

      if (data.success) {
        setManualModalOpen(false);
        setManualDoc('');
        setManualSearchResults([]);
        setSelectedManualParticipant(null);
        if (data.status === 'sucesso') {
          const fakeLog = {
            status_validacao: 'sucesso',
            Participante: data.participante
          };
          showModal(fakeLog);
        }
      } else {
        showMessage("Erro", data.msg || "Erro ao registrar entrada", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro de comunicação com servidor", "error");
    }
  };

  const openCreateMode = () => {
    setManualMode('create');
    // Tenta pré-preencher com o que foi digitado se parecer um nome ou documento
    setNewParticipant({ ...newParticipant, documento: manualDoc, nome: manualDoc });
    setManualSearchResults([]);
  };

  const handleManualEntryClick = () => {
    setManualDoc('');
    setManualMode('search');
    setNewParticipant({ nome: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' });
    setManualModalOpen(true);
  };

  // submitManualEntry original removido/simplificado pois agora o fluxo é via seleção ou criação.
  // Mantemos apenas para casos de "Enter" direto (tenta pegar o primeiro ou criar)
  const submitManualEntry = async () => {
    if (manualSearchResults.length > 0) {
      selectManualParticipant(manualSearchResults[0]);
    } else {
      openCreateMode();
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newParticipant)
      });
      const data = await res.json();

      if (data.success) {
        setManualModalOpen(false);
        setManualMode('search');
        setNewParticipant({ nome: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' });
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
      const res = await fetch(`${API_URL}/participantes/busca?q=${term}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: companionName, responsavel_id: responsavelId })
      });
      const data = await res.json();

      if (data.success) {
        resetCompanionModal();
        showMessage("Sucesso", "Acompanhante registrado com sucesso!", "success");
        showModal({
          status_validacao: 'sucesso',
          Acompanhante: { nome: companionName },
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
    setFinishConfirmText('');
    setFinishModalOpen(true);
  };

  const confirmFinishEvent = async () => {
    setFinishModalOpen(false);
    if (!evento) return;

    try {
      const res = await fetch(`${API_URL}/eventos/${evento.id}/finalizar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
          <p className="access-subtitle" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
            {biometricQualityMsg ? (
              <span style={{ color: '#FF9800', fontWeight: 'bold', animation: 'shake 0.5s infinite' }}>
                ⚠️ {biometricQualityMsg}
              </span>
            ) : 'Posicione seu dedo no leitor biométrico'}
          </p>

          <div style={{
            padding: '0.3rem 0.8rem',
            borderRadius: '12px',
            backgroundColor: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)') : 'rgba(244, 67, 54, 0.2)',
            border: `1px solid ${bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#4CAF50' : '#FF9800') : '#F44336'}`,
            color: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#4CAF50' : '#FF9800') : '#F44336',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: bridgeStatus === 'connected' ? (scannerStatus === 'connected' ? '#4CAF50' : '#FF9800') : '#F44336',
              boxShadow: bridgeStatus === 'connected' && scannerStatus === 'connected' ? '0 0 8px #4CAF50' : 'none'
            }}></div>
            {bridgeStatus === 'connected'
              ? (scannerStatus === 'connected' ? 'Leitor Ativo' : 'Leitor Desconectado')
              : 'Bridge Offline'}
          </div>

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
    const participante = modalData.Participante || modalData.Acompanhante || {};

    return (
      <div className={`access-panel ${statusClass}`} style={{ position: 'relative', overflow: 'hidden', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                <span className="info-value" style={{ fontSize: '0.95rem' }}>{participante.cpf || '-'}</span>
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
          onClick={handleFinishClick}
          style={{
            backgroundColor: '#fd7e14',
            border: 'none',
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
      </Navbar >

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
              <div className="stat-value">{(stats.totalParticipantesUnicos || 0) + (stats.totalAcompanhantes || 0)}</div>

              {/* Barra de Participantes vs Acompanhantes */}
              {logs.length > 0 && (() => {
                const totalParticipantes = stats.totalParticipantesUnicos || 0;
                const totalAcompanhantes = stats.totalAcompanhantes || 0;
                const totalPessoas = totalParticipantes + totalAcompanhantes;

                const percentParticipants = totalPessoas > 0 ? Math.round((totalParticipantes / totalPessoas) * 100) : 0;
                const percentCompanions = totalPessoas > 0 ? Math.round((totalAcompanhantes / totalPessoas) * 100) : 0;

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
              <div className="stat-value">{stats.totalParticipantesUnicos || 0}</div>


            </div>
            <div className="card" style={{ opacity: (evento && !evento.permitir_acompanhantes) ? 0.5 : 1 }}>
              <h2>Acompanhantes Presentes</h2>
              <div className="stat-value">{logs.filter(l => l.status_validacao === 'sucesso' && l.AcompanhanteId).length}</div>
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
              <h2>Entradas Manuais</h2>
              <div className="stat-value" style={{ color: 'var(--accent-color)' }}>
                {stats.manualCount || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sem biometria</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0',
            borderBottom: '1px solid #eee',
            paddingBottom: '0.8rem'
          }}>
            <h3 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Lista de Entrada</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => window.open('/totem', '_blank')}
                style={{
                  backgroundColor: '#b1d249',
                  border: 'none',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                Totem de Check-in
              </button>
              {evento && evento.habilitar_checkout && (
                <button
                  onClick={() => window.open('/totem-checkout', '_blank')}
                  style={{
                    backgroundColor: '#0d6efd',
                    border: 'none',
                    color: 'white',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}
                >
                  Totem de Check-out
                </button>
              )}
              <div style={{ width: '1px', backgroundColor: '#ddd', margin: '0 0.5rem' }}></div>
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
                  cursor: (evento && !evento.permitir_acompanhantes) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  opacity: (evento && !evento.permitir_acompanhantes) ? 0.5 : 1
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
                  <th style={{ width: '15%' }}>Tipo</th>
                  <th style={{ width: '15%' }}>CRM</th>
                  <th style={{ width: '12%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 1. Filtrar Acessos com Sucesso
                  const successLogs = logs.filter(l => l.status_validacao === 'sucesso');

                  // 2. Agrupar por Participante para pegar o primeiro acesso (mais antigo)
                  // Os logs vêm do backend ordenados por createdAt DESC (mais recente primeiro).
                  // Então, se iterarmos de trás para frente ou usarmos um Map sobrescrevendo,
                  // precisamos garantir que pegamos o MAIS ANTIGO.

                  const uniqueMap = new Map();

                  // Ordenamos ASC (antigo pro novo) antes de processar
                  const sortedAsc = [...successLogs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                  sortedAsc.forEach(log => {
                    const key = log.ParticipanteId ? `P-${log.ParticipanteId}` : (log.AcompanhanteId ? `A-${log.AcompanhanteId}` : null);
                    if (key && !uniqueMap.has(key)) {
                      uniqueMap.set(key, log);
                    }
                  });

                  // 3. Converter de volta para lista e aplicar filtro de busca
                  const uniqueLogs = Array.from(uniqueMap.values());

                  // 4. Ordenar para exibição
                  uniqueLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                  // 5. Calcular índices dos acompanhantes
                  const responsibleCounters = new Map(); // Map<ParticipanteId, count>
                  const companionIndexMap = new Map();   // Map<AcompanhanteId, index>

                  // Ordenar por data CRESCENTE para numerar na ordem de chegada
                  const sortedForIndexing = [...uniqueLogs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                  sortedForIndexing.forEach(log => {
                    const isAcompanhante = !!log.AcompanhanteId;
                    if (isAcompanhante && log.Acompanhante && log.Acompanhante.ParticipanteId) {
                      const respId = log.Acompanhante.ParticipanteId;
                      const currentCount = (responsibleCounters.get(respId) || 0) + 1;
                      responsibleCounters.set(respId, currentCount);
                      companionIndexMap.set(log.AcompanhanteId, currentCount);
                    }
                  });


                  const displayedLogs = uniqueLogs.filter(log => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const participante = log.Participante || log.Acompanhante || {};
                    const nome = participante.nome || 'Desconhecido';
                    const cpf = participante.cpf || (log.Acompanhante ? 'Acompanhante' : '');
                    const crm = participante.crm || '';
                    return nome.toLowerCase().includes(term) || cpf.toLowerCase().includes(term) || crm.toLowerCase().includes(term);
                  });

                  // Display sorted descending (newest first)
                  displayedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                  if (displayedLogs.length === 0) {
                    return (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                          {logs.length === 0 ? "Aguardando registros..." : "Nenhum participante encontrado com este filtro."}
                        </td>
                      </tr>
                    );
                  }

                  return displayedLogs.map(log => {
                    const isAcompanhante = !!log.AcompanhanteId;
                    const pessoa = log.Participante || log.Acompanhante || { nome: 'Desconhecido' };
                    let badgeText = '';
                    let badgeColor = '';
                    let badgeBg = '';

                    if (isAcompanhante) {
                      const index = companionIndexMap.get(log.AcompanhanteId) || '?';
                      badgeText = `Acompanhante ${index}`;
                      badgeBg = '#e9ecef';
                      badgeColor = '#495057';
                    } else {
                      badgeText = 'Participante';
                      badgeBg = '#e7f5ff';
                      badgeColor = '#1c7ed6';
                    }

                    return (
                      <tr key={log.id}>
                        <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td>
                          {formatName(pessoa.nome)}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.7rem',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${badgeBg}`,
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                            {badgeText}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {log.Participante?.crm || (isAcompanhante ? '-' : '-')}
                        </td>
                        <td>
                          <span className={`badge badge-success`}>
                            SUCESSO
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
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
      <div className={`modal-overlay ${manualModalOpen ? 'open' : ''}`} onClick={() => { setManualModalOpen(false); setManualMode('search'); setSelectedManualParticipant(null); }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          {manualMode === 'search' ? (
            selectedManualParticipant ? (
              // TELA DE CONFIRMAÇÃO
              <>
                <div className="modal-header" style={{ color: 'var(--text-primary)' }}>Confirmar Entrada</div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#e7f5ff',
                    color: '#1c7ed6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    margin: '0 auto 1rem'
                  }}>
                    {selectedManualParticipant.nome.charAt(0)}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{selectedManualParticipant.nome}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {selectedManualParticipant.cpf ? `CPF: ${selectedManualParticipant.cpf}` : ''}
                  </p>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {selectedManualParticipant.crm ? `CRM: ${selectedManualParticipant.crm}` : ''}
                  </p>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedManualParticipant(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    style={{ backgroundColor: 'var(--success-color)' }}
                    onClick={() => selectManualParticipant(selectedManualParticipant)}
                  >
                    Confirmar Entrada
                  </button>
                </div>
              </>
            ) : (
              // TELA DE BUSCA (Padrão)
              <>
                <div className="modal-header">Localizar Pessoa</div>
                <input
                  ref={manualInputRef}
                  type="text"
                  className="modal-input"
                  placeholder="Digite Nome, CPF ou CRM"
                  value={manualDoc}
                  onChange={e => handleManualSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitManualEntry()}
                  style={{ marginBottom: '0.5rem' }}
                />

                {/* Lista de Resultados da Busca Manual */}
                {manualSearchResults.length > 0 ? (
                  <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: '#fff',
                    marginBottom: '1rem'
                  }}>
                    {manualSearchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedManualParticipant(p)}
                        style={{
                          padding: '0.8rem',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.nome}</div>
                          <div style={{ color: '#666', fontSize: '0.85rem' }}>{p.cpf ? `CPF: ${p.cpf}` : ''} {p.crm ? `| CRM: ${p.crm}` : ''}</div>
                        </div>
                        <span style={{ fontSize: '1.2rem' }}>➡️</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  manualDoc.length >= 3 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                      Nenhum participante encontrado.
                    </div>
                  )
                )}

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => { setManualModalOpen(false); setManualMode('search'); setSelectedManualParticipant(null); }}>Cancelar</button>
                  <button className="btn-primary" onClick={openCreateMode}>Cadastrar Nova Pessoa</button>
                </div>
              </>
            )
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
                  onChange={e => setNewParticipant({ ...newParticipant, cpf: e.target.value })}
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
                <button className="btn-secondary" onClick={() => { setManualMode('search'); setNewParticipant({ nome: '', cpf: '', crm: '', data_nascimento: '', genero: 'Outro' }); }}>Voltar</button>
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
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Tem certeza que deseja encerrar <strong>{evento?.nome}</strong>? <br />
            Essa ação não pode ser desfeita.
          </p>

          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#666' }}>
              Digite <strong>FINALIZAR EVENTO</strong> para confirmar:
            </label>
            <input
              type="text"
              value={finishConfirmText}
              onChange={e => setFinishConfirmText(e.target.value)}
              placeholder="FINALIZAR EVENTO"
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              onPaste={e => e.preventDefault()} // Opcional: impedir colar para forçar digitação
            />
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setFinishModalOpen(false)}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={confirmFinishEvent}
              disabled={finishConfirmText !== 'FINALIZAR EVENTO'}
              style={{
                backgroundColor: finishConfirmText === 'FINALIZAR EVENTO' ? 'var(--error-color)' : '#ccc',
                cursor: finishConfirmText === 'FINALIZAR EVENTO' ? 'pointer' : 'not-allowed'
              }}
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
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>{r.cpf || r.crm}</span>
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

      {/* Botão de Simulação Flutuante */}
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', opacity: 0.1, zIndex: 1000 }}>
        <button
          onClick={() => setSimulating(!simulating)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: simulating ? '#e1e4e8' : '#333',
            color: simulating ? '#333' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}
        >
          {simulating ? 'Parar Simulação' : 'Simular Entrada'}
        </button>
      </div>
    </>
  );
}

export default ControleAcesso;
