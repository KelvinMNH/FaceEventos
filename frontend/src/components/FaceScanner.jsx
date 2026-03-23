import React, { useEffect, useRef, useState, useId } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Singleton para carregar modelos uma única vez na sessão
let modelsPromise = null;
const loadModels = () => {
    if (!modelsPromise) {
        modelsPromise = Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
    }
    return modelsPromise;
};

export const FaceScanner = ({ active = true, onScanSuccess, onFaceDetected, isRegistration = false, token = '', eventId = '', followerBalloon = null, glowColor = null }) => {
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [scanCooldown, setScanCooldown] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Carregando modelos...');
    const [errorMsg, setErrorMsg] = useState('');
    const candidatesRef = useRef([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceBox, setFaceBox] = useState(null); // Real-time coordinates
    const faceBoxTimeoutRef = useRef(null);
    const maskId = useId();

    // Notify parent about face detection
    useEffect(() => {
        if (onFaceDetected) onFaceDetected(faceDetected);
    }, [faceDetected, onFaceDetected]);

    // 1. Carregar Modelos
    useEffect(() => {
        let mounted = true;
        loadModels().then(() => {
            if (mounted) {
                setModelsLoaded(true);
                setStatusMsg('Câmera Pronta');
            }
        }).catch(e => {
            console.error("Erro ao carregar modelos face-api:", e);
            if (mounted) setErrorMsg('Falha ao carregar modelos de IA.');
        });
        return () => { mounted = false; };
    }, []);

    // 2. Loop de Detecção em tempo real
    useEffect(() => {
        let interval;
        if (modelsLoaded && !scanCooldown && active) {
            interval = setInterval(async () => {
                if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                    try {
                        const video = webcamRef.current.video;
                        const displaySize = { width: video.clientWidth, height: video.clientHeight };
                        
                        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                            .withFaceLandmarks()
                            .withFaceDescriptor();

                        if (detection) {
                            setFaceDetected(true);
                            // Ajustar coordenadas para o tamanho de exibição atual
                            const resized = faceapi.resizeResults(detection, displaySize);
                            
                            // Limpar timeout de "sumiço" se o rosto voltou
                            if (faceBoxTimeoutRef.current) {
                                clearTimeout(faceBoxTimeoutRef.current);
                                faceBoxTimeoutRef.current = null;
                            }
                            setFaceBox(resized.detection.box);

                            // Identificação automática apenas fora do modo de registro e se houver eventoId
                            if (!isRegistration && eventId) {
                                handleIdentification(detection.descriptor);
                            }
                        } else {
                            setFaceDetected(false);
                            // Graça de 600ms para o balão não piscar se a detecção falhar por um frame
                            if (!faceBoxTimeoutRef.current) {
                                faceBoxTimeoutRef.current = setTimeout(() => {
                                    setFaceBox(null);
                                    faceBoxTimeoutRef.current = null;
                                }, 600);
                            }
                        }
                    } catch (err) {
                        setFaceDetected(false);
                    }
                }
            }, 200); // Frequência maior para o balão acompanhar suavemente
        }
        return () => {
            clearInterval(interval);
            if (faceBoxTimeoutRef.current) clearTimeout(faceBoxTimeoutRef.current);
            setFaceBox(null);
        };
    }, [modelsLoaded, scanCooldown, isRegistration, eventId, active]);

    // Limpar cache de candidatos ao reativar o scanner (ex: após fechar modal de renovação)
    useEffect(() => {
        if (active) candidatesRef.current = [];
    }, [active]);

    // 3. Lógica de Identificação
    const handleIdentification = async (descriptor) => {
        if (isVerifying) return;
        setIsVerifying(true);

        try {
            if (!token) return; // Aguardar token carregar
            setStatusMsg('Buscando...');
            // Buscar candidatos se não houver em cache
            if (candidatesRef.current.length === 0) {
                const res = await fetch(`${API_URL}/biometria/candidatos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    candidatesRef.current = await res.json();
                }
            }

            if (candidatesRef.current.length === 0) {
                setErrorMsg('Nenhuma face cadastrada no sistema.');
                setStatusMsg('Aguardando...');
                setIsVerifying(false);
                return;
            }

            // Comparação Euclidiana (Padrão para face-api.js)
            let bestMatch = null;
            let minDistance = 0.45; // Threshold mais rigoroso para evitar falsos positivos (Padrão sugerido: 0.4 a 0.5)

            for (const candidate of candidatesRef.current) {
                try {
                    const savedDescriptor = JSON.parse(candidate.template_biometrico);
                    if (Array.isArray(savedDescriptor)) {
                        const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestMatch = candidate;
                        }
                    }
                } catch (e) { /* pular erro de parse */ }
            }

            if (bestMatch) {
                setStatusMsg('Identificado!');
                // Sucesso! Avisa o componente pai
                const screenshot = webcamRef.current.getScreenshot();
                onScanSuccess(null, null, null, bestMatch.id, screenshot);
                setScanCooldown(true);
                setTimeout(() => setScanCooldown(false), 5000); // Cooldown para evitar logs duplicados
            } else {
                setStatusMsg('Face não reconhecida');
                // IMPORTANTE: Avisar o pai mesmo se não reconhecer, para ele poder mostrar o GLOW VERMELHO
                const screenshot = webcamRef.current.getScreenshot();
                onScanSuccess(null, null, null, null, screenshot); 
                
                setScanCooldown(true); // Evita spam de erro
                setTimeout(() => {
                    setScanCooldown(false);
                    setStatusMsg('Câmera Pronta');
                }, 3000);
            }
        } catch (e) {
            console.error('Erro na identificação facial:', e);
        } finally {
            setIsVerifying(false);
        }
    };

    // 4. Lógica de Captura para Cadastro
    const handleCaptureEnroll = async () => {
        if (!webcamRef.current) return;
        
        setStatusMsg('Capturando...');
        const video = webcamRef.current.video;
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            const descriptorString = JSON.stringify(Array.from(detection.descriptor));
            const screenshot = webcamRef.current.getScreenshot();
            // onScanSuccess(template, width, height, identifiedId, image)
            onScanSuccess(descriptorString, null, null, null, screenshot); 
            setStatusMsg('Captura realizada!');
        } else {
            setErrorMsg('Nenhum rosto detectado. Tente novamente.');
            setTimeout(() => setErrorMsg(''), 3000);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                mirrored={true}
            />

            {/* Overlay de Status */}
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '90%', textAlign: 'center', zIndex: 10 }}>
                {statusMsg && !followerBalloon && (
                    <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', display: 'inline-block' }}>
                        {statusMsg}
                    </div>
                )}
                {errorMsg && (
                    <div style={{ background: 'rgba(255,0,0,0.7)', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', marginTop: '5px' }}>
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* Guia Visual e Balão */}
            {modelsLoaded && (
                <svg
                    viewBox="0 0 400 400"
                    preserveAspectRatio="xMidYMid slice"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 5
                    }}
                >
                    <defs>
                        <mask id={`faceMask-${maskId}`}>
                            <rect width="400" height="400" fill="white" />
                            <ellipse cx="200" cy="180" rx="112" ry="152" fill="black" />
                        </mask>
                    </defs>
                    
                    {/* Overlay Escuro com Furo (Opacidade ajustada para 65%) */}
                    <rect width="400" height="400" fill="rgba(0,0,0,0.65)" mask={`url(#faceMask-${maskId})`} />
                    
                    {/* Borda da Elipse (Somente brilha se houver rosto detectado) */}
                    <ellipse 
                        cx="200" 
                        cy="180" 
                        rx="112" 
                        ry="152" 
                        fill="none" 
                        stroke={faceDetected ? (glowColor || '#ffc107') : 'rgba(255,255,255,0.4)'} 
                        strokeWidth="3" 
                        strokeDasharray={faceDetected ? 'none' : '10,5'}
                        style={{ 
                            transition: 'all 0.3s ease', 
                            filter: faceDetected ? `drop-shadow(0 0 10px ${glowColor || '#ffc107'})` : 'none' 
                        }}
                    />

                    {/* BALÃO DE IDENTIFICAÇÃO - POSIÇÃO FIXA (Só aparece se houver alguém na frente) */}
                    {followerBalloon && faceDetected && (() => {
                        const nameLen = followerBalloon.name.length;
                        const bWidth = Math.min(300, Math.max(160, nameLen * 9 + 40));
                        const hw = bWidth / 2;
                        // Path dinâmico centrado em (0,0)
                        const dPath = `M${-hw + 15},-25 h${bWidth - 30} a15,15 0 0 1 15,15 v30 a15,15 0 0 1 -15,15 h${-(hw - 10)} l-10,10 l-10,-10 h${-(hw - 10)} a15,15 0 0 1 -15,-15 v-30 a15,15 0 0 1 15,-15 z`;

                        return (
                            <g transform="translate(200, 45)" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="balloonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#ffec3d', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#ffc107', stopOpacity: 1 }} />
                                    </linearGradient>
                                    <filter id="balloonShadow" x="-100%" y="-100%" width="300%" height="300%">
                                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.3" />
                                    </filter>
                                </defs>

                                <g transform="translate(0, 0)">
                                    {/* Corpo do Balão (Dinamicamente redimensionado) */}
                                    <path 
                                        d={dPath} 
                                        fill="url(#balloonGradient)" 
                                        filter="url(#balloonShadow)"
                                        style={{ animation: 'floatBalloon 2s ease-in-out infinite' }}
                                    />
                                    
                                    {/* Conteúdo de Texto Centralizado */}
                                    <text 
                                        x="0"
                                        y="2" 
                                        textAnchor="middle" 
                                        fill="#333" 
                                        style={{ fontFamily: 'system-ui, sans-serif' }}
                                    >
                                        <tspan x="0" dy="0" fontSize="13" fontWeight="bold">{followerBalloon.name}</tspan>
                                        <tspan x="0" dy="18" fontSize="11" fontWeight="600" fill="rgba(0,0,0,0.8)">Já entrou nesse evento.</tspan>
                                    </text>
                                </g>
                            </g>
                        );
                    })()}
                </svg>
            )}

            <style>{`
                @keyframes floatBalloon {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
            `}</style>

            {/* Botão de Cadastro (só aparece em modo registro) */}
            {isRegistration && modelsLoaded && (
                <button 
                    onClick={handleCaptureEnroll}
                    title="Capturar Face"
                    style={{ 
                        position: 'absolute', 
                        bottom: '20px', 
                        right: '20px', 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '50%', 
                        border: '5px solid white', 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        cursor: 'pointer', 
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', opacity: 0.8 }} />
                </button>
            )}
        </div>
    );
};
