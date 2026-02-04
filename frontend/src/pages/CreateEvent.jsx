import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function CreateEvent() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: '',
        data: '',
        hora: '',
        local: '',
        imagem: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3000/api/eventos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                navigate('/access');
            } else {
                alert('Erro ao criar evento');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imagem: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <>
            <Navbar />
            <div className="page-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 100px)' // Altura total menos navbar
            }}>
                <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                    <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', color: 'var(--text-primary)' }}>Novo Evento</h1>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome do Evento</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Congresso de Tecnologia 2026"
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Data</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.data}
                                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Hora</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.hora}
                                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Local / Endereço</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Centro de Convenções - Hall A"
                                value={formData.local}
                                onChange={e => setFormData({ ...formData, local: e.target.value })}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', boxSizing: 'border-box' }}
                            />

                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Imagem do Evento (Opcional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                            />
                            {formData.imagem && (
                                <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                                    <img src={formData.imagem} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: '0 4px 6px rgba(46, 164, 79, 0.2)'
                            }}
                        >
                            {loading ? 'Criando...' : 'Iniciar Evento'}
                        </button>

                    </form>
                </div>
            </div>
        </>
    );
}

export default CreateEvent;
