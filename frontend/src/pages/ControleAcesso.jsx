import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MessageModal from '../components/MessageModal';
import { useAuth } from '../contexts/AuthContext';
import { FaceScanner } from '../components/FaceScanner';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const FaceIcon = ({ size = "1em", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M9 11.75c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm6 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-2.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
  </svg>
);

function ControleAcesso() {
  const navigate = useNavigate();
  const { uuid } = useParams();
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [evento, setEvento] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [balloonData, setBalloonData] = useState(null);
  const [glowColor, setGlowColor] = useState(null);
 // Feedback balão que segue a cabeça
  const [isFaceDetected, setIsFaceDetected] = useState(false); // Se há um rosto na frente da câmera
  const [lastLogId, setLastLogId] = useState(0);
  const [stats, setStats] = useState({ faixaPredominante: '-', generoPredominante: '-', generoPercent: 0, mediaIdade: 0 });
  const [distribuicaoHorario, setDistribuicaoHorario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');


  const audioRef = useRef(new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3')); // Som de exemplo
  const modalTimeoutRef = useRef(null);
  const alertCooldownsRef = useRef(new Map());

  // Modal Manual State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDoc, setManualDoc] = useState('');
  const manualInputRef = useRef(null);
  const [manualSearchResults, setManualSearchResults] = useState([]); // Novos resultados da busca manual
  const [selectedManualParticipant, setSelectedManualParticipant] = useState(null); // Para confirmação antes de registrar


  // Companion States
  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [responsavelId, setResponsavelId] = useState(null);
  const [responsibleSearchTerm, setResponsibleSearchTerm] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState(null); // Para mostrar o nome na tela

  // Modal Finish State
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishConfirmText, setFinishConfirmText] = useState('');
  const [messageModal, setMessageModal] = useState({ open: false, title: '', message: '', type: 'info', onOk: null });

  // Checkout States
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSearchTerm, setCheckoutSearchTerm] = useState('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [submittingCompanion, setSubmittingCompanion] = useState(false);

  const showMessage = (title, message, type = 'info', onOk = null) => {
    setMessageModal({ open: true, title, message, type, onOk });
  };

  useEffect(() => {
    // Buscar detalhes do evento específico
    const fetchEvento = async () => {
      if (!token || !uuid) return;
      try {
        const res = await fetch(`${API_URL}/eventos/${uuid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.id) setEvento(data);
        else {
          showMessage("Erro", "Evento não encontrado.", "error", () => navigate('/'));
        }
      } catch (e) { 
        console.error(e);
        showMessage("Erro", "Erro ao carregar evento.", "error", () => navigate('/'));
      }
    };
    fetchEvento();

    const fetchLogs = async () => {
      // Só buscar logs se houver evento ativo
      if (!evento || !token) return;

      try {
        const resLogs = await fetch(`${API_URL}/logs?eventoUuid=${uuid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const allLogs = await resLogs.json();

        // Filtrar logs deste evento
        const filteredLogs = allLogs.filter(log => {
          return log && log.status_validacao === 'sucesso' && (log.Participante || log.Acompanhante);
        });

        setLogs(filteredLogs);

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

        const latest = filteredLogs[0]; // Assuming filteredLogs is already sorted by createdAt DESC
        if (filteredLogs && filteredLogs.length > 0) {
          if (lastLogId === 0) {
            setLastLogId(filteredLogs[0].id);
          } else {
            const newLogs = filteredLogs.filter(l => l.id > lastLogId);
            if (newLogs.length > 0) {
                setLastLogId(filteredLogs[0].id);
                // Prioridade: se houver algum SUCESSO na lista, mostre o mais recente deles.
                // Caso contrário, mostre o mais recente (newLogs[0] pois filteredLogs é DESC)
                const successLog = [...newLogs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .find(l => l.status_validacao === 'sucesso');
                
                const logToShow = successLog || newLogs[0];
                if (['sucesso', 'nao_encontrado', 'alerta'].includes(logToShow.status_validacao)) {
                    showModal(logToShow);
                }
            }
          }
        }
        const participantes = Array.from(presentesMap.values());

        // Contar Entradas Manuais (baseado na primeira entrada)
        let manualCount = 0;
        firstLogMap.forEach(log => {
          // Se o device_id NÃO for 'futronic_web', consideramos manual (inclui 'manual_entry_web', 'new_entry_web', etc)
          if (log.device_id && !log.device_id.includes('web')) {
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

        // Contagem de Saídas (Check-out)
        const totalSaidas = filteredLogs.filter(l => l.status_validacao === 'sucesso' && l.tipo_acesso === 'saida').length;

        // Distribuição Horária (para gráfico SVG)
        const agora = new Date();
        
        // Base padrão: últimas 8 horas
        let startTime = agora.getTime() - (7 * 3600000);

        if (evento && evento.hora_inicio) {
          try {
            const [h, m] = evento.hora_inicio.split(':').map(Number);
            const eventStartBase = new Date(agora);
            eventStartBase.setHours(h, m, 0, 0);
            
            const graphStartLimit = eventStartBase.getTime() - 3600000; // 1h antes
            
            // Se o 'agora' ainda não passou de 8h do início do gráfico, fixamos o início.
            // Se já passou de 8h, deixamos o sliding window (startTime padrão) agir.
            if (agora.getTime() > graphStartLimit && (agora.getTime() - graphStartLimit) < (8 * 3600000)) {
              startTime = graphStartLimit;
            } else if (agora.getTime() < graphStartLimit) {
                // Caso o evento ainda não tenha começado, já mostramos a janela a partir de -1h
                startTime = graphStartLimit;
            }
          } catch(e) { 
            console.error("Erro calcular hora inicio", e); 
          }
        }

        // Calcular distribuição horária (agrupando se a janela for > 12h)
        const durationH = (agora.getTime() - startTime) / 3600000;
        let stepH = 1;
        if (durationH > 12) stepH = Math.ceil(durationH / 10);

        const distArray = [];
        const numSlots = Math.ceil(durationH / stepH);

        for (let i = 0; i < numSlots; i++) {
          const t = new Date(startTime + (i * stepH * 3600000));
          const label = t.getHours().toString().padStart(2, '0') + 'h';
          distArray.push({ label, count: 0 });
        }

        filteredLogs.filter(l => l.tipo_acesso === 'entrada').forEach(log => {
          const logTime = new Date(log.createdAt).getTime();
          const slotIdx = Math.floor((logTime - startTime) / (stepH * 3600000));
          if (slotIdx >= 0 && slotIdx < numSlots) {
            distArray[slotIdx].count++;
          }
        });
        setDistribuicaoHorario(distArray);

        setStats({
          faixaPredominante,
          generoPredominante,
          generoPercent,
          percentMale,
          percentFemale,
          mediaIdade: idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0,
          manualCount,
          totalAcompanhantes,
          totalParticipantesUnicos: participantes.length,
          totalSaidas,
          ocupacaoAtual: (participantes.length + totalAcompanhantes) - totalSaidas,
          distribuicaoHorario: distArray // Use the new distArray here
        });
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
      }
    };

    // Polling a cada 2 segundos
    const interval = setInterval(fetchLogs, 2000);
    fetchLogs(); // Primeira chamada

    return () => clearInterval(interval);
  }, [lastLogId, navigate, evento, token, uuid]);



  // Facial recognition handle

  const handleBiometricAttempt = async (template, width, height, identifiedId, image) => {
    try {
      let url = `${API_URL}/scan`;
      let bodyData = {
        identified_id: identifiedId,
        device_id: 'face_admin',
        eventId: uuid
      };

      // SÓ RENOVA se:
      // 1. O modal manual estiver aberto E houver participante selecionado
      // 2. A chamada NÃO vier de uma identificação automática (identifiedId nulo)
      // 3. Houver uma imagem capturada
      if (selectedManualParticipant && manualModalOpen && !identifiedId && image) {
        url = `${API_URL}/renovar-biometria`;
        bodyData.participanteId = selectedManualParticipant.id;
        bodyData.template = template;
        bodyData.foto = image;
        bodyData.eventoId = uuid;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();

      if (data.autorizado) {
        if (selectedManualParticipant && manualModalOpen) {
          setManualModalOpen(false);
          setManualDoc('');
          setManualSearchResults([]);
          setSelectedManualParticipant(null);
        }

        const fakeLog = {
          status_validacao: 'sucesso',
          Participante: data.participante
        };
        showModal(fakeLog);
      } else {
        const msg = (data.mensagem || "").toLowerCase();
        const isAlreadyIn = data.already_in || 
                           msg.includes('identificado') || 
                           msg.includes('registrado') || 
                           msg.includes('validado') ||
                           msg.includes('entrou');

        const p = data.participante || { nome: 'Não Identificado' };
        const fakeLog = {
          status_validacao: isAlreadyIn ? 'alerta' : 'falha',
          Participante: p,
          ParticipanteId: p.id, // Explicitamente passa o ID para o showModal
          mensagem: data.mensagem || "Biometria não reconhecida"
        };
        showModal(fakeLog);
      }
    } catch (e) {
      console.error("Erro ao enviar biometria", e);
    }
  };

  // Efeito para focar no input quando abrir modal ou mudar modo
  useEffect(() => {
    if ((manualModalOpen) || (companionModalOpen && !responsavelId)) {
      setTimeout(() => {
        if (manualInputRef.current) manualInputRef.current.focus();
      }, 100);
    }
  }, [manualModalOpen, companionModalOpen, responsavelId]);

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
        body: JSON.stringify({ 
          participanteId: p.id,
          eventoId: uuid 
        })
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



  const handleManualEntryClick = () => {
    setManualDoc('');
    setManualModalOpen(true);
  };

  // submitManualEntry original removido/simplificado pois agora o fluxo é via seleção ou criação.
  // Mantemos apenas para casos de "Enter" direto (tenta pegar o primeiro ou criar)
  const submitManualEntry = async () => {
    if (manualSearchResults.length > 0) {
      selectManualParticipant(manualSearchResults[0]);
    }
  };






  const selectResponsible = (p) => {
    setResponsavelId(p.id);
    setSelectedResponsible(p);
    setResponsibleSearchTerm(''); // Limpa busca
  };

  const resetCompanionModal = () => {
    setCompanionModalOpen(false);
    setCompanionName('');
    setResponsavelId(null);
    setSelectedResponsible(null);
    setResponsibleSearchTerm('');
  };

  const submitCompanion = async () => {
    if (!companionName || !responsavelId || submittingCompanion) return;
    setSubmittingCompanion(true);

    try {
      const res = await fetch(`${API_URL}/registrar-acompanhante`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          nome: companionName, 
          responsavel_id: responsavelId,
          eventoId: uuid
        })
      });
      const data = await res.json();

      if (data.success) {
        // Capturar nomes antes de resetar o estado
        const cProps = {
          status_validacao: 'sucesso',
          Acompanhante: { nome: companionName },
          Responsavel: selectedResponsible,
          tipo_acesso: 'entrada'
        };

        resetCompanionModal();
        showMessage("Sucesso", "Acompanhante registrado com sucesso!", "success");
        showModal(cProps);
      } else {
        console.error("Erro retornado pelo backend:", data);
        showMessage("Erro", data.msg || data.error || "Erro ao registrar acompanhante", "error");
      }
    } catch (e) {
      console.error("Exceção capturada no submitCompanion:", e);
      showMessage("Erro", "Erro na conexão: " + e.message, "error");
    } finally {
      setSubmittingCompanion(false);
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
      const res = await fetch(`${API_URL}/eventos/${uuid}/finalizar`, {
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

  const showModal = (data) => {
    const p = data.Participante || data.Acompanhante || {};
    const msg = (data.mensagem || "").toLowerCase();
    const isAlert = data.status_validacao === 'alerta' || 
                   msg.includes('já identificado') || 
                   msg.includes('ja registrado') || 
                   msg.includes('já registrado') ||
                   msg.includes('já realizado') ||
                   msg.includes('ja realizado') ||
                   msg.includes('entrou');

    // 1. Cooldown para "Já Identificado" (Evita spam se a pessoa ficar na frente da câmera)
    // NOTA: Agora ativamos o cooldown também em caso de SUCESSO, para evitar que um alerta "Já Identificado"
    // apareça logo em seguida enquanto a pessoa ainda está na frente do sensor.
    const isSuccess = data.status_validacao === 'sucesso';
    const personId = p.id || data.ParticipanteId || data.AcompanhanteId;
    
    if ((isAlert || isSuccess) && personId) {
        const now = Date.now();
        const key = String(personId);
        const lastAlert = alertCooldownsRef.current.get(key) || 0;
        
        // Se for um alerta tentando aparecer em cima de um alerta ou sucesso recente (< 15s)
        if (isAlert && (now - lastAlert < 15000)) { 
            return; // Silencia o alerta
        }
        
        // Atualiza o timestamp para futuras supressões de alerta
        alertCooldownsRef.current.set(key, now);
    }

    // 2. Se já estivermos mostrando um SUCESSO para o mesmo participante, ignore alertas redundantes
    if (modalData && modalData.status_validacao === 'sucesso') {
      const currentP = modalData.Participante || modalData.Acompanhante || {};
      const isSamePerson = (currentP.id && p.id && String(currentP.id) === String(p.id));
      
      if (isSamePerson && isAlert) {
         return;
      }
    }

    // Limpar timeout anterior se existir
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }

    setModalData(data);
    // Tocar som
    if (audioRef.current) audioRef.current.play().catch(e => console.log(e));
    
    // Se for alerta de "Já identificado", ativa o balão que segue a cabeça
    if (isAlert) {
      const p = data.Participante || data.Acompanhante || {};
      setBalloonData({
        name: p.nome || 'Visitante',
        message: 'Já entrou nesse evento.'
      });
      setGlowColor('#ffc107'); // Amarelo para duplicidade
    } else if (data.status_validacao === 'sucesso') {
      setGlowColor('#198754'); // Verde para entrada
    } else {
      setGlowColor('#dc3545'); // Vermelho para erro
    }

    modalTimeoutRef.current = setTimeout(() => {
      setModalData(null);
      setBalloonData(null);
      setGlowColor(null);
      modalTimeoutRef.current = null;
    }, 6000); // 6 segundos para dar tempo de ler e sincronizar com a barra de progresso
  };

  const handleConfirmCheckout = async (participanteId) => {
    if (!participanteId || !evento) return;
    setIsProcessingCheckout(true);

    try {
      const res = await fetch(`${API_URL}/registrar-saida`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participanteId,
          eventoId: uuid
        })
      });
      const data = await res.json();

      if (data.success) {
        setCheckoutModalOpen(false);
        setCheckoutSearchTerm('');
        
        // Mostrar feedback visual no painel
        const fakeLog = {
          status_validacao: 'sucesso',
          tipo_acesso: 'saida', // Marker para o render
          Participante: data.participante
        };
        showModal(fakeLog);
      } else {
        showMessage("Erro", data.msg || "Erro ao registrar saída", "error");
      }
    } catch (e) {
      console.error(e);
      showMessage("Erro", "Erro de comunicação com o servidor", "error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Helper para identificar quem está "Dentro"
  const getParticipantsInside = () => {
    // logs já vêm ordenados por createdAt DESC (mais recentes primeiro)
    const statusMap = new Map();
    
    logs.forEach(log => {
      // Registramos apenas o primeiro encontro de cada participante (que é o mais recente)
      if (log.status_validacao === 'sucesso' && log.ParticipanteId && !statusMap.has(log.ParticipanteId)) {
        statusMap.set(log.ParticipanteId, {
          tipo: log.tipo_acesso,
          participante: log.Participante
        });
      }
    });

    return Array.from(statusMap.values())
      .filter(item => item.tipo === 'entrada')
      .map(item => item.participante);
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

  const maskCPF = (cpf) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
    }
    return cpf;
  };

  const renderAccessPanel = () => {
    const isSuccess = modalData?.status_validacao === 'sucesso';
    const isAlert = modalData?.status_validacao === 'alerta';
    const participante = modalData?.Participante || modalData?.Acompanhante || {};
    const cardColor = isSuccess ? '#198754' : (isAlert ? '#ffc107' : '#dc3545');

    return (
      <div className="access-panel-container" style={{ 
        position: 'relative', 
        height: '600px', 
        background: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e1e4e8',
        overflow: 'hidden'
      }}>
        {/* Camera Feed - Absolutely positioned to prevent shifts */}
        <div style={{ 
          width: '400px', 
          height: '400px', 
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '15px', 
          overflow: 'hidden', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          zIndex: 1
        }}>
          <FaceScanner 
            active={!manualModalOpen && !companionModalOpen && !finishModalOpen}
            onScanSuccess={handleBiometricAttempt} 
            onFaceDetected={setIsFaceDetected}
            isRegistration={false} 
            token={token}
            eventId={uuid}
            followerBalloon={balloonData}
            glowColor={glowColor}
          />
        </div>

        {/* Status Text Area - Persistent to keep layout stable */}
        <div style={{ 
          position: 'absolute',
          top: '460px',
          width: '100%',
          textAlign: 'center',
          visibility: 'visible',
          zIndex: 1
        }}>
          <h2 className="access-title" style={{ fontSize: '1.4rem' }}>Aproximar Rosto</h2>
          <p className="access-subtitle" style={{ fontSize: '0.9rem' }}>O reconhecimento facial está ativo</p>
        </div>

        {/* Full Success Overlay (400x400) */}
        {isSuccess && (
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            height: '400px',
            backgroundColor: 'rgba(25, 135, 84, 0.5)',
            borderRadius: '15px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '4px solid white',
                overflow: 'hidden',
                marginBottom: '1rem',
                backgroundColor: 'rgba(255,255,255,0.2)'
            }}>
                {participante.foto_biometria ? (
                    <img src={participante.foto_biometria} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Face" />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold' }}>
                        {participante.nome ? participante.nome.charAt(0) : '?'}
                    </div>
                )}
            </div>
            
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                {participante.genero === 'F' ? 'Bem-vinda' : (participante.genero === 'M' ? 'Bem-vindo' : 'Bem-vindo(a)')},
            </h2>
            <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', lineHeight: '1.1' }}>
                {participante.nome || 'Visitante'}
            </h1>
            {participante.crm && (
                <div style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>
                    CRM: {participante.crm}
                </div>
            )}
            <div style={{ fontSize: '1.2rem', fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '50px' }}>
                Tenha um bom evento!
            </div>
          </div>
        )}

        {/* Floating Card - Only if identified and NOT shown via balloon and NOT shown via full success overlay */}
        {modalData && !balloonData && !isSuccess && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: '#ffffff',
            width: '90%',
            maxWidth: '340px',
            padding: '1.2rem 1.5rem',
            borderRadius: '1.2rem',
            boxShadow: '0 15px 45px rgba(0,0,0,0.2)',
            textAlign: 'center',
            border: `2px solid ${cardColor}44`,
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: `3px solid ${cardColor}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {participante.foto_biometria ? (
                  <img src={participante.foto_biometria} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Face" />
                ) : (
                  <span style={{ fontSize: '1.5rem', color: cardColor, fontWeight: 'bold' }}>
                    {participante.nome ? participante.nome.charAt(0) : '?'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: cardColor, fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                  {(() => {
                    const hr = new Date().getHours();
                    if (hr < 12) return "Bom dia";
                    if (hr < 18) return "Boa tarde";
                    return "Boa noite";
                  })()}! {isSuccess ? 'Sucesso' : (isAlert ? 'Identificado' : 'Aviso')}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginBottom: '4px', lineHeight: '1.2' }}>
                  {participante.nome || 'Visitante'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem', color: '#666', marginBottom: '6px' }}>
                  <span>CPF: {maskCPF(participante.cpf)}</span>
                  {participante.crm && <span>CRM: <strong>{participante.crm}</strong></span>}
                </div>
                <div style={{ color: cardColor, fontSize: '0.9rem', fontWeight: '600' }}>
                  {isSuccess ? 'Entrada Confirmada! ✓' : (isAlert ? 'Já registrado! ✓' : (modalData.mensagem || 'Falha'))}
                </div>
              </div>
            </div>

            {/* Progress Bar (at bottom of card) */}
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              backgroundColor: 'rgba(0,0,0,0.05)', 
              borderBottomLeftRadius: '1.2rem',
              borderBottomRightRadius: '1.2rem',
              overflow: 'hidden' 
            }}>
              <div style={{
                height: '100%',
                backgroundColor: cardColor,
                animation: 'progressBar 6s linear forwards',
                width: '100%'
              }}></div>
            </div>
          </div>
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
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e66d10';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#fd7e14';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
                <div className="stat-value">{stats.totalParticipantesUnicos || 0}</div>
                {stats.totalAcompanhantes > 0 && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    + {stats.totalAcompanhantes} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>Acompanhantes</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card">
              <h2>Total de Saídas</h2>
              <div className="stat-value" style={{ color: '#888' }}>{stats.totalSaidas || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Check-outs realizados</div>
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

            {/* CARD: Ocupação Atual */}
            <div className="card" style={{ borderColor: stats.ocupacaoAtual > (evento?.capacidade * 0.9) ? 'var(--alert-color)' : 'var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h2>Ocupação Atual</h2>
                {stats.totalSaidas > 0 && <span style={{ fontSize: '0.65rem', color: '#888', background: '#eee', padding: '2px 5px', borderRadius: '4px' }}>{stats.totalSaidas} Saídas</span>}
              </div>
              <div className="stat-value" style={{ color: stats.ocupacaoAtual > 0 ? 'var(--accent-color)' : 'inherit' }}>
                {stats.ocupacaoAtual || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pessoas no local</div>
            </div>

            {/* CARD: Fluxo Horário (Bar Chart) */}
            <div className="card" onClick={() => setFlowModalOpen(true)} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              <h2>Fluxo de Horário (Clique para detalhes)</h2>
              <div style={{ height: '40px', marginTop: '0.5rem', position: 'relative' }}>
                {Array.isArray(distribuicaoHorario) && distribuicaoHorario.length > 0 ? (
                  <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradFluxo" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--accent-color)', stopOpacity: 0.3 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--accent-color)', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const maxVal = Math.max(...distribuicaoHorario.map(d => d.count), 5);
                      const points = distribuicaoHorario.map((d, i) => {
                        const x = (i / Math.max(distribuicaoHorario.length - 1, 1)) * 100;
                        const y = 40 - (d.count / maxVal) * 35; 
                        return `${x},${y}`;
                      }).join(' ');
                      
                      const areaPoints = `0,40 ${points} 100,40`;
                      
                      return (
                        <>
                          <polyline points={points} fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinejoin="round" />
                          <polygon points={areaPoints} fill="url(#gradFluxo)" />
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: '#999', textAlign: 'center', paddingTop: '10px' }}>Iniciando fluxo...</div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#999', marginTop: '4px' }}>
                <span>{distribuicaoHorario?.[0]?.label || ''}</span>
                <span>Pico: {Math.max(...(distribuicaoHorario?.map(d => d.count) || [0]))}</span>
                <span>{distribuicaoHorario?.[distribuicaoHorario.length - 1]?.label || ''}</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '0',
            borderBottom: '1px solid #eee',
            paddingBottom: '1rem'
          }}>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Painel de Controle</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem',
              alignItems: 'stretch'
            }}>
              {/* Linha 1: Totens */}
              <button
                onClick={() => window.open(`/totem/${evento?.uuid}`, '_blank')}
                style={{
                  backgroundColor: '#b1d249',
                  border: 'none',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  gridColumn: '1'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#9ebc41';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#b1d249';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Totem de Check-in
              </button>

              {evento && evento.habilitar_checkout ? (
                <button
                  onClick={() => window.open(`/totem-checkout/${evento?.uuid}`, '_blank')}
                  style={{
                    backgroundColor: '#0d6efd',
                    border: 'none',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    gridColumn: '2'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#0b5ed7';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d6efd';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Totem de Check-out
                </button>
              ) : (
                <div style={{ gridColumn: '2' }}></div> // Spacer se checkout desligado
              )}

              {/* Spacer para manter a grade 3x2 alinhada (Coluna 3 da linha 1) */}
              <div style={{ gridColumn: '3' }}></div>

              {/* Linha 2: Ações Manuais */}
              <button
                onClick={handleManualEntryClick}
                style={{
                  backgroundColor: 'var(--accent-color)',
                  border: 'none',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  gridRow: '2',
                  gridColumn: '1'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#007a4a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <span>+</span> Registrar Participante
              </button>

              {evento && evento.habilitar_checkout ? (
                <button
                  onClick={() => setCheckoutModalOpen(true)}
                  style={{
                    backgroundColor: '#0d6efd',
                    border: 'none',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    gridRow: '2',
                    gridColumn: '2'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#0b5ed7';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d6efd';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <span>-</span> Registrar Saída
                </button>
              ) : (
                 <div style={{ gridRow: '2', gridColumn: '2' }}></div> // Spacer se checkout desligado
              )}

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
                  padding: '1rem',
                  borderRadius: '6px',
                  cursor: (evento && !evento.permitir_acompanhantes) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (evento && !evento.permitir_acompanhantes) ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  boxShadow: (evento && !evento.permitir_acompanhantes) ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                  gridRow: '2',
                  gridColumn: '3'
                }}
                onMouseOver={(e) => {
                  if (evento && evento.permitir_acompanhantes) {
                    e.currentTarget.style.backgroundColor = '#007a4a';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (evento && evento.permitir_acompanhantes) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }
                }}
              >
                <span>+</span> Registrar Acompanhante
              </button>
            </div>
          </div>
          {/* Container sem gap para colar o título na tabela */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <h3 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Lista de Entrada</h3>
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
                      <tr key={log.id} style={{ 
                        opacity: log.tipo_acesso === 'saida' ? 0.6 : 1,
                        backgroundColor: log.tipo_acesso === 'saida' ? '#f8f9fa' : 'transparent'
                      }}>
                        <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td>
                          <div style={{
                            maxWidth: '300px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: log.tipo_acesso === 'saida' ? 'line-through' : 'none'
                          }} title={pessoa.nome}>
                            {pessoa.nome}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.7rem',
                            backgroundColor: log.tipo_acesso === 'saida' ? '#eee' : badgeBg,
                            color: log.tipo_acesso === 'saida' ? '#888' : badgeColor,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${log.tipo_acesso === 'saida' ? '#ddd' : badgeBg}`,
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                            {log.tipo_acesso === 'saida' ? 'Checkout' : badgeText}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {log.Participante?.crm || (isAcompanhante ? '-' : '-')}
                        </td>
                        <td>
                          <span className={`badge ${log.tipo_acesso === 'saida' ? 'badge-neutral' : 'badge-success'}`}>
                            {log.tipo_acesso === 'saida' ? 'SAÍDA' : 'SUCESSO'}
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
      <div className={`modal-overlay ${manualModalOpen ? 'open' : ''}`} onClick={() => { setManualModalOpen(false); setSelectedManualParticipant(null); }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
          {selectedManualParticipant ? (
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
                    CPF: {maskCPF(selectedManualParticipant.cpf)}
                  </p>
                  <div style={{ margin: '0.3rem 0', color: '#666', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {selectedManualParticipant.crm && <span>CRM: <strong>{selectedManualParticipant.crm}</strong></span>}
                    {selectedManualParticipant.especialidade && <span style={{ color: '#0d6efd', fontStyle: 'italic' }}>{selectedManualParticipant.especialidade}</span>}
                  </div>

                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#e7f5ff', border: '1px solid #74c0fc', borderRadius: '8px', color: '#1864ab' }}>
                    <FaceScanner 
                      onScanSuccess={handleBiometricAttempt} 
                      isRegistration={true} 
                      token={token}
                    />
                    <div style={{ marginTop: '0.8rem', fontSize: '0.85rem' }}>
                      <strong>Captura Facial para Renovação:</strong><br />
                      Clique no botão flutuante para capturar o rosto e atualizar a biometria.
                    </div>
                  </div>
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
                    Pular Biometria e Confirmar Entrada
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
                          <div style={{ color: '#666', fontSize: '0.85rem' }}>{p.cpf ? `CPF: ${maskCPF(p.cpf)}` : ''} {p.crm ? `| CRM: ${p.crm}` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {p.template_biometrico && !p.template_biometrico.startsWith('manual_') ? (
                            <span title="Face Cadastrada" style={{ color: '#4CAF50', display: 'flex' }}><FaceIcon size="1.8rem" /></span>
                          ) : (
                            <span title="Sem Biometria" style={{ color: '#666', opacity: 0.3, filter: 'grayscale(100%)', display: 'flex' }}><FaceIcon size="1.8rem" /></span>
                          )}
                          <span style={{ fontSize: '1.2rem' }}>➡️</span>
                        </div>
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
                  <button className="btn-secondary" onClick={() => { setManualModalOpen(false); setSelectedManualParticipant(null); }}>Cancelar</button>
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
              <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#666' }}>Selecione o responsável presente:</p>
              <input
                type="text"
                className="modal-input"
                autoFocus
                placeholder="Buscar por nome ou CPF..."
                value={responsibleSearchTerm}
                onChange={e => setResponsibleSearchTerm(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                background: '#fff'
              }}>
                {(() => {
                  const present = getParticipantsInside();
                  const filtered = present.filter(p => {
                    if (!responsibleSearchTerm) return true;
                    const term = responsibleSearchTerm.toLowerCase();
                    return p.nome.toLowerCase().includes(term) || (p.cpf && p.cpf.includes(term)) || (p.crm && p.crm.toLowerCase().includes(term));
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                        {present.length === 0 ? "Ninguém está com entrada ativa no momento." : "Nenhum resultado para esta busca."}
                      </div>
                    );
                  }

                  return filtered.map(r => (
                    <div
                      key={r.id}
                      onClick={() => selectResponsible(r)}
                      style={{
                        padding: '0.8rem',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, color: '#333' }}>{r.nome}</span>
                        <div style={{ color: '#666', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span>CPF: {maskCPF(r.cpf)}</span>
                          {r.crm && <span>| CRM: {r.crm}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>➡️</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
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
                <p style={{ margin: '0 0 0.2rem 0', fontWeight: 'bold', color: '#2c7a7b' }}>{selectedResponsible?.nome}</p>
                <div style={{ color: '#319795', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>CPF: {maskCPF(selectedResponsible?.cpf)}</span>
                  {selectedResponsible?.crm && <span>CRM: {selectedResponsible?.crm}</span>}
                  {selectedResponsible?.especialidade && <span style={{ fontStyle: 'italic' }}>{selectedResponsible?.especialidade}</span>}
                </div>
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
            <button className="btn-secondary" onClick={resetCompanionModal} disabled={submittingCompanion}>Cancelar</button>
            {responsavelId && (
              <button 
                className="btn-primary" 
                onClick={submitCompanion} 
                disabled={submittingCompanion}
              >
                {submittingCompanion ? 'Registrando...' : 'Confirmar Entrada'}
              </button>
            )}
          </div>
        </div>
      </div >

      {/* Modal Registrar Saída (Checkout) */}
      <div className={`modal-overlay ${checkoutModalOpen ? 'open' : ''}`} onClick={() => setCheckoutModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95%' }}>
          <h2 className="modal-header" style={{ color: '#0d6efd' }}>Registrar Saída (Checkout)</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              className="modal-input"
              placeholder="Buscar pessoa presente por nome ou CPF..."
              value={checkoutSearchTerm}
              onChange={e => setCheckoutSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto', 
            border: '1px solid #eee', 
            borderRadius: '8px' 
          }}>
            {(() => {
              const present = getParticipantsInside();
              const filtered = present.filter(p => {
                if (!checkoutSearchTerm) return true;
                const term = checkoutSearchTerm.toLowerCase();
                return p.nome.toLowerCase().includes(term) || (p.cpf && p.cpf.includes(term)) || (p.crm && p.crm.toLowerCase().includes(term));
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    {present.length === 0 ? "Ninguém está com entrada ativa no momento." : "Nenhum resultado para esta busca."}
                  </div>
                );
              }

              return filtered.map(p => (
                <div 
                  key={p.id}
                  onClick={() => !isProcessingCheckout && handleConfirmCheckout(p.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: isProcessingCheckout ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => !isProcessingCheckout && (e.currentTarget.style.backgroundColor = '#f0f7ff')}
                  onMouseLeave={e => !isProcessingCheckout && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#333' }}>{p.nome}</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      CPF: {maskCPF(p.cpf)} {p.crm ? `| CRM: ${p.crm}` : ''}
                    </span>
                  </div>
                  <button 
                    style={{
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Confirmar Saída
                  </button>
                </div>
              ));
            })()}
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setCheckoutModalOpen(false)}>Fechar</button>
          </div>
        </div>
      </div>

      {/* Modal: Fluxo Detalhado */}
      <div className={`modal-overlay ${flowModalOpen ? 'open' : ''}`} onClick={() => setFlowModalOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="modal-header" style={{ margin: 0 }}>Fluxo Detalhado de Entradas</h2>
            <button className="close-btn" onClick={() => setFlowModalOpen(false)} style={{ color: '#999' }}>×</button>
          </div>
          
          <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ height: '240px', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                {/* Linhas de Grade de Horário */}
                {(() => {
                  const items = [];
                  const agora = new Date();
                  
                  // Arredondar para a hora cheia para as linhas ficarem alinhadas (ex: 10:00, 11:00)
                  const agoraHoraCheia = new Date(agora);
                  agoraHoraCheia.setMinutes(0, 0, 0);

                  let startTime = agoraHoraCheia.getTime() - (7 * 3600000);
                  if (evento && evento.hora_inicio) {
                    const [h, m] = evento.hora_inicio.split(':').map(Number);
                    const eStart = new Date(agora);
                    eStart.setHours(h, m, 0, 0);
                    
                    const limit = eStart.getTime() - 3600000;
                    if (agora.getTime() > limit && (agora.getTime() - limit) < (8 * 3600000)) startTime = limit;
                    else if (agora.getTime() < limit) startTime = limit;
                  }

                  const endTime = startTime + (8 * 3600000);

                  // Linhas de Grade Horizontais
                  [50, 100, 150].forEach(y => {
                    items.push(<line key={`h-${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#f0f0f0" strokeWidth="1" />);
                  });

                  // Linhas de Grade Verticais (inteligente)
                  const totalDurationH = (endTime - startTime) / 3600000;
                  let gridStepH = 1;
                  if (totalDurationH > 14) gridStepH = Math.ceil(totalDurationH / 12);

                  const numGridLines = Math.floor(totalDurationH / gridStepH);
                  for (let i = 0; i <= numGridLines; i++) {
                    const t = new Date(startTime + (i * gridStepH * 3600000));
                    // Posição X proporcional ao tempo total
                    const x = ((t.getTime() - startTime) / (endTime - startTime)) * 1000;
                    
                    if (x >= 0 && x <= 1000) {
                      items.push(
                        <g key={`v-${i}`}>
                          <line x1={x} y1="0" x2={x} y2="200" stroke="#eee" strokeWidth="1" strokeDasharray="4" />
                          <text x={x} y="220" fontSize="12" fill="#999" textAnchor="middle">{t.getHours()}h</text>
                        </g>
                      );
                    }
                  }

                  // Pontos das Entradas e Saídas
                  logs.filter(l => l.status_validacao === 'sucesso').forEach((log, idx) => {
                    const logTime = new Date(log.createdAt).getTime();
                    if (logTime >= startTime && logTime <= endTime) {
                      const x = ((logTime - startTime) / (endTime - startTime)) * 1000;
                      // Jitter vertical para dar efeito de densidade/agrupamento
                      const seed = typeof log.id === 'number' ? log.id : (idx + 500);
                      const jitter = (Math.sin(seed * 123.45) * 60) + 100; 
                      const isSaida = log.tipo_acesso === 'saida';
                      
                      items.push(
                        <circle 
                          key={`dot-${log.id}`} 
                          cx={x} 
                          cy={jitter} 
                          r="4" 
                          fill={isSaida ? '#339af0' : 'var(--accent-color)'} 
                          fillOpacity="0.5"
                        >
                          <title>{log.Participante?.nome || 'Acompanhante'} - {isSaida ? 'SAÍDA' : 'ENTRADA'} - {new Date(log.createdAt).toLocaleTimeString()}</title>
                        </circle>
                      );
                    }
                  });

                  return items;
                })()}
              </svg>
            </div>
          </div>
          
          <div style={{ marginTop: '3.5rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-color)' }}></div>
                <span>Entradas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#339af0' }}></div>
                <span>Saídas</span>
              </div>
            </div>
            <p>Cada ponto representa um movimento de acesso. <br/> 
            Zonas com <strong>maior concentração de pontos</strong> indicam horários de pico.</p>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setFlowModalOpen(false)}>Fechar</button>
          </div>
        </div>
      </div>

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
