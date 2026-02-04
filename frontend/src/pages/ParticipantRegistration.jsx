/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

function ParticipantRegistration() {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        crm: '',
        genero: 'Outro',
        data_nascimento: ''
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                console.log("Modelos FaceAPI carregados");
            } catch (e) {
                console.error("Erro ao carregar modelos:", e);
                setMsg({ type: 'warning', text: 'Modo offline: Reconhecimento facial pode ser limitado.' });
                // Ainda permite cadastro sem descriptor avançado
                setModelsLoaded(false);
            }
        };
        loadModels();
    }, []);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
    }, [webcamRef]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Processar biometria
            let descriptor = null;
            if (imgSrc && modelsLoaded) {
                try {
                    const img = await faceapi.fetchImage(imgSrc);
                    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                    if (detection) {
                        // Serializar descriptor para salvar no banco
                        descriptor = JSON.stringify(Array.from(detection.descriptor));
                        console.log("Descriptor gerado com sucesso.");
                    } else {
                        // Se tirou foto mas não detectou rosto, avisa mas deixa prosseguir se o usuário quiser
                        if (!confirm("Não foi possível detectar um rosto com clareza na foto. Deseja prosseguir sem biometria facial para este cadastro?")) {
                            setLoading(false);
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Erro processamento face-api:", err);
                }
            }

            const payload = {
                ...formData,
                documento: formData.cpf,
                foto: imgSrc || null,
                template_biometrico: descriptor || (imgSrc ? `PHOTO_ONLY_${Date.now()}` : null)
            };

            const res = await fetch(`${API_URL}/cadastrar-entrada`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setMsg({ type: 'success', text: 'Cadastro realizado com sucesso!' });
                setFormData({ nome: '', cpf: '', crm: '', genero: 'Outro', data_nascimento: '' });
                setImgSrc(null);
            } else {
                setMsg({ type: 'error', text: data.msg || 'Erro ao cadastrar' });
            }

        } catch (e) {
            console.error(e);
            setMsg({ type: 'error', text: 'Erro ao conectar ao servidor.' });
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-color)' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
                <h1 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Cadastro Biométrico Facial</h1>

                {msg && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: '8px',
                        backgroundColor: msg.type === 'error' ? '#ffebee' : '#e8f5e9',
                        color: msg.type === 'error' ? '#c62828' : '#2e7d32'
                    }}>
                        {msg.text}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Coluna Esquerda: Formulário */}
                    <div className="card" style={{ flex: 1, minWidth: '300px', padding: '2rem' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Dados do Participante</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="input-label">Nome Completo</label>
                                <input className="modal-input" placeholder="Ex: João da Silva" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="input-label">CPF</label>
                                <input className="modal-input" placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="input-label">CRM (Opcional)</label>
                                <input className="modal-input" placeholder="CRM/UF 12345" value={formData.crm} onChange={e => setFormData({ ...formData, crm: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="input-label">Data de Nascimento</label>
                                <input type="date" className="modal-input" value={formData.data_nascimento} onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="input-label">Gênero</label>
                                <select className="modal-input" value={formData.genero} onChange={e => setFormData({ ...formData, genero: e.target.value })}>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                                {loading ? 'Processando...' : 'Cadastrar Rosto'}
                            </button>
                        </form>
                    </div>

                    {/* Coluna Direita: Câmera */}
                    <div className="card" style={{ flex: 1, minWidth: '300px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Captura Facial</h2>
                        {!imgSrc ? (
                            <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center' }}>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }}
                                    style={{ width: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '20px',
                                    left: '0',
                                    right: '0',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <button
                                        type="button"
                                        onClick={capture}
                                        style={{
                                            backgroundColor: '#fff',
                                            border: '4px solid var(--primary-color)',
                                            borderRadius: '50%',
                                            width: '60px',
                                            height: '60px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px'
                                        }}
                                        title="Capturar"
                                    >
                                        📸
                                    </button>
                                </div>
                                {!modelsLoaded && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.7)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column'
                                    }}>
                                        <div className="spinner"></div>
                                        <p style={{ marginTop: '1rem' }}>Carregando IA Facial...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <img src={imgSrc} alt="Captura" style={{ width: '100%', borderRadius: '12px', border: '2px solid var(--primary-color)' }} />
                                <button type="button" className="btn-secondary" onClick={() => setImgSrc(null)}>Tirar Outra Foto</button>
                            </div>
                        )}
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                            Certifique-se que o rosto está bem iluminado e centralizado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ParticipantRegistration;
