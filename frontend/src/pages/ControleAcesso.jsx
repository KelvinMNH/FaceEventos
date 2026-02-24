import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ModalMensagem from '../components/ModalMensagem';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

import { db } from '../services/ServicoArmazenamento';

// const API_URL = 'http://localhost:3000/api';

const globalValidations = new Map();

function ControleAcesso() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [evento, setEvento] = useState(null);
  const [lastLogId, setLastLogId] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [stats, setStats] = useState({ faixaPredominante: '-', generoPredominante: '-', generoPercent: 0, mediaIdade: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [simulating, setSimulating] = useState(false);



  const handledLogIds = useRef(new Set());

  // States para detecção facial
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // States para Feedback de Captura (Cadastro)
  const [captureFeedbackOpen, setCaptureFeedbackOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [tempDescriptor, setTempDescriptor] = useState(null);

  // Carregar Modelos da FaceAPI
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        console.log("Modelos carregados no AccessControl");
      } catch (e) { console.error("Erro models:", e); }
    };
    loadModels();
  }, []);

  // Loop de detecção
  useEffect(() => {
    let interval;
    // Só roda detecção se houver evento ativo
    if (modelsLoaded && !scanCooldown && !modalData && evento) {
      interval = setInterval(async () => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
          try {
            const video = webcamRef.current.video;
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

            if (detection) {
              const descriptor = Array.from(detection.descriptor);

              // Já temos evento no state, mas podemos confirmar se ainda é o mesmo ou usar o do state
              // Como 'evento' está nas dependências, se mudar, o loop reinicia com o novo.

              const data = db.validarBiometria(descriptor, evento.id);

              if (data.authorized) {
                const pid = String(data.participante.id);
                const now = Date.now();
                const last = globalValidations.get(pid);

                // Se a pessoa já foi identificada (jaRegistrado=true no service ou globalValidations recente),
                // apenas mostrar toast sem modal e sem gerar novo log
                if (data.jaRegistrado || (last && (now - last < 86400000))) {
                  // Só mostrar toast silencioso, sem travar a câmera com um cooldown longo
                  setToastMessage({ text: data.participante.nome + ' já registrado', type: 'success' });
                  setTimeout(() => setToastMessage(null), 2000);
                } else {
                  globalValidations.set(pid, now);
                  if (data.access_id) handledLogIds.current.add(data.access_id);
                  showModal({
                    status_validacao: 'sucesso',
                    Participante: data.participante
                  });
                  setScanCooldown(true);
                  setTimeout(() => setScanCooldown(false), 2000);
                }
              } else {
                if (data.access_id) handledLogIds.current.add(data.access_id);
                showModal({
                  status_validacao: 'nao_encontrado'
                });
                setScanCooldown(true);
                setTimeout(() => setScanCooldown(false), 3000);
              }
            }
          } catch (err) {
            // ignorar
          }
        }
      }, 800);
    }
    return () => clearInterval(interval);
  }, [modelsLoaded, modalData, scanCooldown, evento]);

  const audioRef = useRef(new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3')); // Som de exemplo
  const modalTimeoutRef = useRef(null);

  // Modal Manual State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDoc, setManualDoc] = useState('');
  const manualInputRef = useRef(null);
  const [manualMode, setManualMode] = useState('search'); // 'search' | 'create'
  const [manualSearchResults, setManualSearchResults] = useState([]); // Array de resultados da busca
  const [newParticipant, setNewParticipant] = useState({ nome: '', documento: '', cpf: '', matricula: '', data_nascimento: '', genero: 'Outro' });

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
    const fetchEvento = () => {
      try {
        const data = db.getEventoAtivo();
        if (data) {
          // Avoid infinite loop: only update if data changed significantly
          setEvento(prev => {
            if (!prev) return data;
            if (prev.id !== data.id || prev.updatedAt !== data.updatedAt) return data;
            return prev;
          });
        } else {
          // Only redirect if we were previously expecting an event or on initial load
          // But to be safe content-wise, let's just warn or redirect once
          if (evento) setEvento(null); // Clear event if it disappeared
          // showMessage("Aviso", "Nenhum evento ativo.", "info"); // Optional: could act as guard
        }
      } catch (e) { console.error(e); }
    };

    const fetchLogs = () => {
      const currentEvento = db.getEventoAtivo();
      if (!currentEvento) return;

      try {
        const filteredLogs = db.getLogs(currentEvento.id);

        if (filteredLogs && filteredLogs.length > 0) {
          setLogs(filteredLogs);

          const latest = filteredLogs[0];
          // Se houver um novo log (ID maior que o último visto)
          if (latest.id > lastLogId) {

            // BUG FIX: Evitar mostrar modal de logs antigos ao carregar a página
            // Só mostra se o log for realmente recente (menos de 10 segundos atrás)
            const logTime = new Date(latest.createdAt).getTime();
            const now = Date.now();
            const isRecent = (now - logTime) < 10000; // 10 segundos

            if (lastLogId === 0) {
              setLastLogId(latest.id);
            } else {
              setLastLogId(latest.id);
              // Se o log já foi tratado localmente pelo loop de scan, não mostra modal de novo
              if (handledLogIds.current.has(latest.id)) return;

              if (isRecent && (latest.status_validacao === 'sucesso' || latest.status_validacao === 'nao_encontrado')) {
                showModal(latest);
              }
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

    // Initial fetch
    fetchEvento();
    fetchLogs();

    // Polling a cada 2 segundos for BOTH event and logs
    const interval = setInterval(() => {
      fetchEvento();
      fetchLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [lastLogId]); // Removed 'evento' and 'navigate' to avoid loops. navigate is stable usually.

  // Simulação Loop
  useEffect(() => {
    let simInterval;
    if (simulating && evento) {
      simInterval = setInterval(async () => {
        try {
          // Simular acesso aleatório
          const res = db.getParticipantes(1, 100);
          const parts = res.data;

          if (parts.length > 0) {
            const randomPart = parts[Math.floor(Math.random() * parts.length)];
            // 80% chance de sucesso
            if (Math.random() > 0.2) {
              db.registrarAcesso(randomPart.id, evento.id, 'sucesso');
            } else {
              db.registrarAcesso(null, evento.id, 'nao_encontrado');
            }
          }
        } catch (e) { console.error("Erro simulação", e); }
      }, 7000); // A cada 7 segundos gera um log
    }
    return () => clearInterval(simInterval);
  }, [simulating, evento]);

  useEffect(() => {
    if (manualModalOpen && manualInputRef.current) {
      setTimeout(() => manualInputRef.current.focus(), 100);
    }
  }, [manualModalOpen]);

  const handleManualEntryClick = () => {
    setManualDoc('');
    setManualMode('search');
    setManualSearchResults([]);
    setNewParticipant({ nome: '', documento: '', genero: 'Outro' });
    setManualModalOpen(true);
  };

  const submitManualEntry = async () => {
    if (!manualDoc) return;
    setManualSearchResults([]);

    try {
      const data = db.buscarParticipantes(manualDoc);

      if (data && data.length > 0) {
        setManualSearchResults(data);
      } else {
        // Se não encontrar, mudar para modo de criação
        setManualMode('create');
        setNewParticipant({ ...newParticipant, documento: manualDoc, cpf: manualDoc }); // Assumindo que pode ser CPF
      }
    } catch (e) {
      showMessage("Erro", "Erro de comunicação com serviço local", "error");
    }
  };

  // Biometric Prompt State
  const [biometricPromptData, setBiometricPromptData] = useState(null);

  const confirmManualEntry = (participante) => {
    // Fecha o modal de busca
    setManualModalOpen(false);
    // Abre o prompt de biometria
    setBiometricPromptData(participante);
  };

  const executeAccessRegistration = async (participante) => {
    try {
      if (!evento) return;

      const log = db.registrarAcesso(participante.id, evento.id, 'sucesso');

      if (log) {
        setManualModalOpen(false);
        showModal({
          status_validacao: 'sucesso',
          Participante: participante
        });
      } else {
        showMessage("Erro", "Erro ao registrar acesso", "error");
      }
    } catch (e) {
      console.error("Erro fetch:", e);
      showMessage("Erro", `Erro ao conectar: ${e.message}`, "error");
    }
  };

  const submitCreateEntry = async () => {
    if (!newParticipant.nome || !newParticipant.cpf || !newParticipant.data_nascimento) {
      showMessage("Aviso", "Preencha Nome, CPF e Data de Nascimento", "info");
      return;
    }

    try {
      const created = db.createParticipante(newParticipant);

      if (created) {
        // Registrar acesso também
        if (evento) db.registrarAcesso(created.id, evento.id, 'sucesso');

        setManualModalOpen(false);
        setManualMode('search');
        setNewParticipant({ nome: '', documento: '', cpf: '', matricula: '', data_nascimento: '', genero: 'Outro', foto: null });
        showMessage("Sucesso", "Participante cadastrado com sucesso!", "success");
        const fakeLog = {
          status_validacao: 'sucesso',
          Participante: created
        };
        showModal(fakeLog);
      } else {
        showMessage("Erro", "Erro ao cadastrar", "error");
      }
    } catch (e) {
      showMessage("Erro", e.message || "Erro ao criar", "error");
    }
  };

  const handleSearchResponsible = async (term) => {
    setResponsibleSearchTerm(term);
    if (term.length < 3) {
      setResponsibleResults([]);
      return;
    }
    try {
      const data = db.buscarParticipantes(term);
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
      const acomp = db.createParticipante({
        nome: companionName,
        documento: 'Acompanhante',
        responsavel_id: responsavelId,
        genero: 'Outro'
      });

      if (evento) db.registrarAcesso(acomp.id, evento.id, 'sucesso');

      if (acomp) {
        resetCompanionModal();
        showMessage("Sucesso", "Acompanhante registrado com sucesso!", "success");
        showModal({
          status_validacao: 'sucesso',
          Participante: { nome: companionName, documento: 'Acompanhante', responsavel_id: responsavelId },
          Responsavel: selectedResponsible
        });
      } else {
        showMessage("Erro", "Erro ao registrar acompanhante", "error");
      }
    } catch (e) {
      showMessage("Erro", "Erro na conexão", "error");
    }
  };

  const captureFacialData = async () => {
    if (!webcamRef.current || !webcamRef.current.video) return;

    // Pausa o scan automático momentaneamente
    setScanCooldown(true);

    try {
      const video = webcamRef.current.video;
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const imageSrc = webcamRef.current.getScreenshot();
        setCapturedImage(imageSrc);
        setTempDescriptor(JSON.stringify(Array.from(detection.descriptor)));
        setCaptureFeedbackOpen(true);
      } else {
        showMessage("Atenção", "Nenhum rosto detectado. Olhe para a câmera.", "warning");
        setTimeout(() => setScanCooldown(false), 1000);
      }
    } catch (e) {
      console.error(e);
      showMessage("Erro", "Falha ao capturar imagem.", "error");
      setScanCooldown(false);
    }
  };

  const confirmCapture = async () => {
    if (tempDescriptor) {
      if (biometricPromptData) {
        // Caso 1: Atualizando biometria de participante existente
        try {
          const updated = db.updateParticipante(biometricPromptData.id, {
            template_biometrico: tempDescriptor,
            foto: capturedImage
          });

          if (updated) {
            showMessage("Sucesso", "Biometria atualizada com sucesso!", "success");
            // Prepara participante atualizado para registro
            const updatedParticipant = {
              ...biometricPromptData,
              template_biometrico: tempDescriptor,
              foto: capturedImage
            };

            setCaptureFeedbackOpen(false);
            setBiometricPromptData(null); // Fecha o prompt
            executeAccessRegistration(updatedParticipant); // Segue o fluxo
          } else {
            showMessage("Erro", "Falha ao salvar biometria.", "error");
          }
        } catch (e) {
          console.error(e);
          showMessage("Erro", "Erro de conexão ao salvar biometria.", "error");
        }
      } else {
        // Caso 2: Criando novo participante (fluxo antigo)
        setNewParticipant(prev => ({
          ...prev,
          template_biometrico: tempDescriptor,
          foto: capturedImage
        }));
        setCaptureFeedbackOpen(false);
        showMessage("Sucesso", "Biometria e foto vinculadas!", "success");
      }
    }
    setScanCooldown(false);
  };

  const cancelCapture = () => {
    setCaptureFeedbackOpen(false);
    setCapturedImage(null);
    setTempDescriptor(null);
    setScanCooldown(false);
  };

  const handleFinishClick = () => {
    if (!evento) return;
    setFinishModalOpen(true);
  };

  const confirmFinishEvent = async () => {
    setFinishModalOpen(false);
    if (!evento) return;

    try {
      const success = db.finalizarEvento(evento.id);
      if (success) {
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
    }, 3000);
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
    // 1. Preparar dados do Modal (se houver)
    const isSuccess = modalData?.status_validacao === 'sucesso';
    const statusClass = isSuccess ? 'success' : 'error';
    const participante = modalData?.Participante || {};

    return (
      <div className="access-camera-box">

        {/* === CAMADA 1: WEBCAM SEMPRE ATIVA === */}
        <div style={{ flex: 1, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            forceScreenshotSourceSize={true}
            onUserMedia={() => console.log('Webcam OK')}
            onUserMediaError={(e) => console.error('Erro Câmera:', e)}
            screenshotFormat="image/jpeg"
            videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            mirrored={true}
          />

          {!modalData && modelsLoaded && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '260px',
              height: '340px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '-30px',
                width: '100%',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                fontWeight: '500',
                letterSpacing: '1px'
              }}>
                POSICIONE O ROSTO
              </div>
            </div>
          )}

          {/* Toast Notification (Aviso Discreto) */}
          {toastMessage && (
            <div style={{
              position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 200, background: toastMessage.type === 'error' ? 'rgba(255,0,0,0.8)' : 'rgba(0,153,93,0.9)',
              color: 'white', padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', fontSize: '1rem',
              animation: 'fadeIn 0.3s'
            }}>
              {toastMessage.text}
            </div>
          )}
        </div>

        {/* === CAMADA 2: INTERFACE DE FEEDBACK (MODAL) === */}
        {modalData && (
          <div className={'access-panel-overlay ' + statusClass} style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: isSuccess ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 230, 230, 0.95)',
            zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem',
            animation: 'fadeIn 0.3s ease-out',
            overflowY: 'auto'
          }}>
            <div className="access-photo-large" style={{
              width: '100px', height: '100px', fontSize: '2.5rem', margin: '0 auto 0.5rem',
              borderWidth: '4px', borderColor: isSuccess ? 'var(--success-color)' : 'var(--error-color)',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {participante.foto ? (
                <img src={participante.foto} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                participante.nome ? participante.nome.charAt(0) : '!'
              )}
            </div>

            {isSuccess ? (
              <>
                <h2 className="access-title" style={{ color: 'var(--success-color)', fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Bem-vindo(a), {participante.nome}!
                </h2>
                <div className="info-grid" style={{ width: '90%', marginTop: '1rem', margin: '1rem auto 0 auto' }}>
                  {/* Row 1: CPF and CRM */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div className="info-item" style={{ flex: 3, background: 'rgba(0,0,0,0.03)', padding: '0.8rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <span className="info-label" style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Documento / CPF</span>
                      <span className="info-value" style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>
                        {participante.cpf || participante.documento || '-'}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 2, background: 'rgba(0,0,0,0.03)', padding: '0.8rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <span className="info-label" style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Matrícula</span>
                      <span className="info-value" style={{ fontWeight: 'bold', color: '#333', fontSize: '1.2rem' }}>
                        {participante.matricula || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Data Nascimento and Gênero */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '0.5rem' }}>
                    <div className="info-item" style={{ flex: 3, background: 'rgba(0,0,0,0.03)', padding: '0.8rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <span className="info-label" style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Data Nasc.</span>
                      <span className="info-value" style={{ fontWeight: 'bold', color: '#333', fontSize: '1.2rem' }}>
                        {participante.data_nascimento ? formatDate(participante.data_nascimento) : '-'}
                      </span>
                    </div>
                    <div className="info-item" style={{ flex: 2, background: 'rgba(0,0,0,0.03)', padding: '0.8rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <span className="info-label" style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Gênero</span>
                      <strong style={{ color: '#555', fontSize: '1.2rem' }}>
                        {participante.genero === 'M' ? 'H' : participante.genero === 'F' ? 'M' : 'O'}
                      </strong>
                    </div>
                  </div>
                </div>
                {/* Barra de Progresso do Timeout */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', background: '#eee' }}>
                  <div style={{ height: '100%', background: 'var(--success-color)', animation: 'progressBar 5s linear forwards', width: '100%' }}></div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Rosto não encontrado</h2>
                <p>Biometria facial não identificada</p>
              </div>
            )}
          </div>
        )}

        {/* Rodapé Fixo (Status Câmera) */}
        {!modalData && (
          <div style={{
            position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center',
            color: 'white', textShadow: '0 1px 2px black', zIndex: 5
          }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', display: 'inline-block', padding: '5px 15px', borderRadius: '20px' }}>
              {modelsLoaded ? '● Câmera Ativa - Aproxime o Rosto' : 'Carregando Inteligência...'}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar>
        <div className="navbar-action-buttons" style={{ gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setSimulating(!simulating)}
            style={{
              backgroundColor: simulating ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
              color: simulating ? '#ffb3b3' : 'rgba(255, 255, 255, 0.5)',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'normal',
              fontSize: '0.7rem',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              if (!simulating) {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'white';
              }
            }}
            onMouseOut={(e) => {
              if (!simulating) {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }
            }}
          >
            {simulating ? '⏹ Parar Simulação' : '▶ Simular'}
          </button>
          <button
            onClick={handleFinishClick}
            style={{
              backgroundColor: 'var(--secondary-green)',
              border: 'none',
              color: 'white',
              padding: '0.6rem 1.2rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#cc5200'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--secondary-green)'}
          >
            Finalizar Evento
          </button>
        </div>
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
              <h2>Total de Pessoas (Únicas)</h2>
              <div className="stat-value">
                {(() => {
                  const isCompanion = (l) => l.Participante?.documento?.startsWith('ACP-') || l.Participante?.documento === 'Acompanhante' || !!l.Responsavel;
                  const uniqueParticipants = new Set(logs.filter(l => l.status_validacao === 'sucesso' && !isCompanion(l)).map(l => l.Participante?.id)).size;
                  const companions = logs.filter(l => l.status_validacao === 'sucesso' && isCompanion(l)).length;
                  return uniqueParticipants + companions;
                })()}
              </div>

              {/* Barra de Participantes vs Acompanhantes */}
              {logs.length > 0 && (() => {
                const isCompanion = (l) => l.Participante?.documento?.startsWith('ACP-') || l.Participante?.documento === 'Acompanhante' || !!l.Responsavel;
                const uniqueParticipants = new Set(logs.filter(l => l.status_validacao === 'sucesso' && !isCompanion(l)).map(l => l.Participante?.id)).size;
                const companions = logs.filter(l => l.status_validacao === 'sucesso' && isCompanion(l)).length;
                const total = uniqueParticipants + companions;

                const percentParticipants = total > 0 ? Math.round((uniqueParticipants / total) * 100) : 0;
                const percentCompanions = total > 0 ? Math.round((companions / total) * 100) : 0;

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
              <div className="stat-value">
                {(() => {
                  const isCompanion = (l) => l.Participante?.documento?.startsWith('ACP-') || l.Participante?.documento === 'Acompanhante' || !!l.Responsavel;
                  return new Set(logs.filter(l => l.status_validacao === 'sucesso' && !isCompanion(l)).map(l => l.Participante?.id)).size;
                })()}
              </div>
            </div>
            <div className="card">
              <h2>Acompanhantes Presentes</h2>
              <div className="stat-value">
                {(() => {
                  const isCompanion = (l) => l.Participante?.documento?.startsWith('ACP-') || l.Participante?.documento === 'Acompanhante' || !!l.Responsavel;
                  return logs.filter(l => l.status_validacao === 'sucesso' && isCompanion(l)).length;
                })()}
              </div>
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

          <div className="access-list-header">
            <h3 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Lista de Entrada</h3>
            <div className="access-list-actions">
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
              placeholder="Localizar por Nome, CPF ou Matrícula..."
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

          <div className="table-container" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none', maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Horário Entrada</th>
                  <th>Participante</th>
                  <th style={{ width: '18%' }}>Matrícula</th>
                  <th style={{ width: '12%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const searchFiltered = logs.filter(log => {
                    // Filtrar apenas sucessos para a Lista de Entrada
                    if (log.status_validacao !== 'sucesso') return false;

                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const p = log.Participante || {};
                    return (p.nome || '').toLowerCase().includes(term) || (p.documento || '').toLowerCase().includes(term);
                  });

                  // Passo 1: Filtrar todo mundo da busca (searchFiltered já ignora failures e segue searchTerm)
                  const validos = logs.filter(log => {
                    if (log.status_validacao !== 'sucesso') return false;
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const p = log.Participante || {};
                    return (p.nome || '').toLowerCase().includes(term) || (p.documento || '').toLowerCase().includes(term);
                  });

                  // Passo 2: Construir o Map percorrendo os validos de TRÁS PRA FRENTE.
                  // A lista "logs" vem do banco ordenado do MAIS NOVO (0) para o MAIS VELHO (N).
                  // Lendo do Fim pro Início e setando no Map, o Map vai SOMENTE inserir itens
                  // que ainda não existem. Assim, garantimos sempre o Primeiro Acesso Cronológico!
                  const finalMap = new Map();

                  for (let i = validos.length - 1; i >= 0; i--) {
                    const l = validos[i];
                    if (l.Participante) {
                      const pid = l.Participante.id;
                      if (!finalMap.has(pid)) {
                        finalMap.set(pid, l);
                      }
                    }
                  }

                  // Passo 3: Converter os values do Map num Array. Ele vai manter a ordem de inserção do Map
                  // (que foi do mais velho pro mais novo).
                  // Como queremos mostrar o mais novo no topo da tabela, aplicamos .reverse().
                  const displayLogs = Array.from(finalMap.values()).reverse();

                  if (displayLogs.length === 0) {
                    return (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                          {searchTerm ? 'Nenhum registro encontrado para esta busca.' : 'Aguardando registros de entrada...'}
                        </td>
                      </tr>
                    );
                  }

                  return displayLogs.map(log => {
                    // Garantimos que a data base do log sendo iterado (que agora sabemos ser do primeiro acesso cronologicamente) seja mostrada sem re-updates de React UI Tick se for o caso, apesar de log.createdAt ser estático.
                    const horaAcesso = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>{horaAcesso}</td>
                        <td>{formatName(log.Participante ? log.Participante.nome : 'Desconhecido')}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {log.Participante?.matricula || '-'}
                        </td>
                        <td>
                          <span className={`badge badge-${log.status_validacao === 'sucesso' ? 'success' : 'error'}`}>
                            {log.status_validacao.toUpperCase()}
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
      <div className={`modal-overlay ${manualModalOpen ? 'open' : ''}`} onClick={() => { setManualModalOpen(false); setManualMode('search'); setManualSearchResults([]); }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
          {manualSearchResults.length > 0 ? (
            <>
              <div className="modal-header">Selecione o Participante</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                {manualSearchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => confirmManualEntry(p)}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #e1e4e8',
                      transition: 'background 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#e1e4e8'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{p.nome}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        CPF: {p.documento} {p.matricula ? `| Matrícula: ${p.matricula}` : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Selecionar</div>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setManualSearchResults([])}>Voltar</button>
              </div>
            </>
          ) : manualMode === 'search' ? (
            <>
              <div className="modal-header">Localizar Pessoa</div>
              <input
                ref={manualInputRef}
                type="text"
                className="modal-input"
                placeholder="Digite Nome, CPF ou Matrícula"
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
                  placeholder="Matrícula (opcional)"
                  value={newParticipant.matricula}
                  onChange={e => setNewParticipant({ ...newParticipant, matricula: e.target.value })}
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

                <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#555' }}>Biometria Facial</div>
                  {newParticipant.template_biometrico ? (
                    <div style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                      ✔ Biometria Capturada
                      <button
                        onClick={() => setNewParticipant(p => ({ ...p, template_biometrico: null }))}
                        style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'red', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-secondary"
                      onClick={captureFacialData}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      📸 Capturar Rosto
                    </button>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setManualMode('search'); setNewParticipant({ nome: '', documento: '', cpf: '', matricula: '', data_nascimento: '', genero: 'Outro' }); }}>Voltar</button>
                <button className="btn-primary" onClick={submitCreateEntry}>Cadastrar e Registrar Entrada</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Finalizar */}
      <div className={`modal-overlay ${finishModalOpen ? 'open' : ''}`} onClick={() => setFinishModalOpen(false)}>
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
                placeholder="Buscar Responsável (Nome ou CPF/Matrícula)"
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

      <ModalMensagem
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        onConfirm={messageModal.onOk}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />

      {/* Modal Feedback Captura Facial */}
      {captureFeedbackOpen && (
        <div className="modal-overlay open" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Confirmação da Foto</h3>
            {capturedImage && (
              <img src={capturedImage} alt="Captura" style={{ width: '100%', borderRadius: '8px', border: '2px solid #eee', marginBottom: '1rem' }} />
            )}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={cancelCapture}>Tentar Novamente</button>
              <button className="btn-primary" onClick={confirmCapture}>Confirmar Foto</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Prompt de Biometria (Renovação/Inserção) */}
      {biometricPromptData && (
        <div className="modal-overlay open" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <h2 className="modal-header">Verificar Biometria</h2>
            <div style={{ margin: '1.5rem 0' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Participante: <strong>{biometricPromptData.nome}</strong>
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                Deseja capturar/atualizar a biometria facial agora?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                className="btn-primary"
                onClick={captureFacialData}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                📸 Cadastrar/Renovar Biometria
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  const p = biometricPromptData;
                  setBiometricPromptData(null);
                  executeAccessRegistration(p);
                }}
              >
                ⏩ Pular e Registrar Acesso
              </button>

              <button
                className="btn-secondary"
                style={{ marginTop: '1rem', border: 'none', background: 'none', color: 'var(--text-secondary)' }}
                onClick={() => setBiometricPromptData(null)}
              >
                Cancelar Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ControleAcesso;



