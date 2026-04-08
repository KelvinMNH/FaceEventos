import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { useClock, useActiveEvent, useBiometricProgress } from '../hooks/useTotem';
import { TotemLayout } from '../components/totem/TotemLayout';
import { WelcomeView, SearchView, ConfirmView, SuccessView, ErrorView } from '../components/totem/TotemViews';
import apiService from '../services/api';

function TotemAcesso() {
    const navigate = useNavigate();
    const { uuid } = useParams();
    const { token } = useAuth();
    
    // View State
    const [view, setView] = useState('welcome');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [scannedUser, setScannedUser] = useState(null);
    const [biometricResult, setBiometricResult] = useState(null); 
    const [balloonData, setBalloonData] = useState(null); 
    const [glowColor, setGlowColor] = useState(null);

    // Wizard Registration States
    const [captureStep, setCaptureStep] = useState(1);
    const [capturedTemplates, setCapturedTemplates] = useState([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Refs
    const stepRef = useRef(1);
    const templatesRef = useRef([]);
    const isVerifyingRef = useRef(false);
    const alertCooldownsRef = useRef(new Map());
    const searchInputRef = useRef(null);

    // Hooks
    const { horaAtual, formatDate, formatTime } = useClock();
    const { evento } = useActiveEvent(token, uuid, setView);
    const progress = useBiometricProgress(biometricResult, view, () => {
        setBiometricResult(null);
        setBalloonData(null);
        setGlowColor(null);
    });

    // Sync refs with state
    useEffect(() => {
        stepRef.current = captureStep;
        templatesRef.current = capturedTemplates;
    }, [captureStep, capturedTemplates]);

    // Focar no input e limpar busca quando entrar na tela de busca
    useEffect(() => {
        if (view === 'search') {
            setSearchTerm('');
            setSearchResults([]);
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 100);
        }
    }, [view]);

    const handleBiometricScan = async (template, width, height, identifiedId, photo) => {
        if (isVerifyingRef.current) return;

        try {
            if (view === 'confirm' && selectedParticipant && template) {
                isVerifyingRef.current = true;
                setIsVerifying(true);
                try {
                    const { data: finalData } = await apiService.post('/renovar-biometria', {
                        participanteId: selectedParticipant.id,
                        template: template,
                        foto: photo,
                        eventoId: uuid
                    }, token);
                    handleFinalResponse(finalData);
                } catch (err) {
                    console.error('Erro na renovação facial:', err);
                    setErrorMsg('Erro ao salvar biometria facial.');
                } finally {
                    isVerifyingRef.current = false;
                    setIsVerifying(false);
                }
                return;
            }

            if (identifiedId !== undefined) {
                isVerifyingRef.current = true;
                setIsVerifying(true);
                try {
                    const { data: finalData } = await apiService.post('/scan', {
                        identified_id: identifiedId,
                        eventId: uuid
                    }, token);
                    handleFinalResponse(finalData);
                } finally {
                    isVerifyingRef.current = false;
                    setIsVerifying(false);
                }
            }
        } catch (error) {
            console.error("Erro no processamento facial:", error);
            setStatusMessage("Erro de comunicação com o servidor.");
            setView('error');
            setTimeout(() => setView('welcome'), 3000);
        }
    };

    const handleFinalResponse = (finalData) => {
        const p = finalData.participante || finalData.Acompanhante || {};
        const msg = (finalData.mensagem || "").toLowerCase();
        const isAlreadyIn = finalData.already_in || 
                           msg.includes('ja validado') || 
                           msg.includes('ja identificado') || 
                           msg.includes('ja realizado') || 
                           msg.includes('ja registrado');

        const isSuccess = finalData.autorizado || finalData.success;
        if ((isAlreadyIn || isSuccess) && p.id) {
            const now = Date.now();
            const key = String(p.id);
            const lastAlert = alertCooldownsRef.current.get(key) || 0;
            if (isAlreadyIn && (now - lastAlert < 15000)) return;
            alertCooldownsRef.current.set(key, now);
        }

        if (biometricResult && biometricResult.type === 'success' && biometricResult.user) {
            if (String(biometricResult.user.id) === String(p.id) && isAlreadyIn) return;
        }

        if (view === 'welcome') {
            if (isAlreadyIn) {
                const par = finalData.participante || { nome: "Participante" };
                setBalloonData({ name: par.nome });
                setBiometricResult({ user: par, type: 'already_in' });
                setGlowColor('#FFE596');
                setTimeout(() => setGlowColor(null), 5000);
                return;
            }
            if (finalData.autorizado || finalData.success) {
                setBiometricResult({ user: finalData.participante || { nome: "Participante" }, type: 'success' });
                setGlowColor('#00995D');
                setTimeout(() => setGlowColor(null), 5000);
                return;
            }
            setGlowColor('#dc3545');
            setTimeout(() => setGlowColor(null), 3000);
            setBiometricResult({ user: { nome: "Visitante" }, type: 'error', message: "Rosto não reconhecido, tente novamente ou localize seu cadastro abaixo" });
            return;
        }

        if (finalData.autorizado || finalData.success) {
            const nome = finalData.participante ? finalData.participante.nome : "Participante";
            setScannedUser(finalData.participante);
            setStatusMessage(`Bem-vindo(a), ${nome}!`);
            setView('success');
            setTimeout(() => {
                setView('welcome');
                setSelectedParticipant(null);
                setCapturedTemplates([]);
                setCaptureStep(1);
                setScannedUser(null);
            }, 3000);
        } else {
            setStatusMessage(finalData.mensagem || "Biometria não identificada");
            setView('error');
            setTimeout(() => {
                setView(view === 'confirm' ? 'confirm' : 'welcome');
                setSelectedParticipant(null);
                setCapturedTemplates([]);
                setCaptureStep(1);
            }, 2000);
        }
    };

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await apiService.get(`/participantes/busca?q=${term}`, token);
            setSearchResults(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectParticipant = (p) => {
        setSelectedParticipant(p);
        setView('confirm');
        setCaptureStep(1);
        setCapturedTemplates([]);
        setErrorMsg('');
        setIsVerifying(false);
    };

    const handleConfirmCheckin = async () => {
        if (!selectedParticipant) return;
        try {
            const { data } = await apiService.post('/manual-entry', { participanteId: selectedParticipant.id, eventoId: uuid }, token);
            if (data.success) {
                setStatusMessage(`Bem-vindo(a), ${selectedParticipant.nome}!`);
                setView('success');
            } else {
                setStatusMessage(data.msg || "Erro ao registrar entrada");
                setView('error');
            }
        } catch (e) {
            setStatusMessage("Erro de comunicação");
            setView('error');
        }

        setTimeout(() => {
            setView('welcome');
            setSearchTerm('');
            setSearchResults([]);
            setSelectedParticipant(null);
            setStatusMessage('');
        }, 4000);
    };

    const maskCPF = (cpf) => {
        if (!cpf) return '-';
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
        }
        return cpf;
    };

    return (
        <TotemLayout title="Check-in" evento={evento} horaAtual={horaAtual} formatDate={formatDate} formatTime={formatTime}>
            {view === 'welcome' && (
                <WelcomeView 
                    handleBiometricScan={handleBiometricScan} 
                    token={token} 
                    uuid={uuid} 
                    balloonData={balloonData} 
                    glowColor={glowColor} 
                    biometricResult={biometricResult} 
                    progress={progress} 
                    setView={setView} 
                />
            )}
            
            {view === 'search' && (
                <SearchView 
                    setView={setView} 
                    searchTerm={searchTerm} 
                    handleSearch={handleSearch} 
                    searchResults={searchResults} 
                    handleSelectParticipant={handleSelectParticipant} 
                    maskCPF={maskCPF} 
                    searchInputRef={searchInputRef} 
                />
            )}

            {view === 'confirm' && selectedParticipant && (
                <ConfirmView 
                    selectedParticipant={selectedParticipant} 
                    maskCPF={maskCPF} 
                    handleBiometricScan={handleBiometricScan} 
                    token={token} 
                    isVerifying={isVerifying} 
                    errorMsg={errorMsg} 
                    setView={setView} 
                    handleConfirmCheckin={handleConfirmCheckin} 
                />
            )}

            {view === 'success' && <SuccessView scannedUser={scannedUser} statusMessage={statusMessage} />}
            {view === 'error' && <ErrorView statusMessage={statusMessage} />}
        </TotemLayout>
    );
}

export default TotemAcesso;
