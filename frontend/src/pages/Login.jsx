import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MessageModal from '../components/MessageModal';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'info' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setModal({ open: true, title: 'Erro', message: 'Preencha todos os campos', type: 'error' });
            return;
        }

        const res = await login(username, password);
        if (res.success) {
            navigate('/');
        } else {
            setModal({ open: true, title: 'Erro', message: res.msg, type: 'error' });
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #00995D 0%, #004E4C 100%)', // Verde Unimed
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ maxWidth: '80px', maxHeight: '80px' }}
                        />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                            <span style={{ color: '#00995D' }}>Uni</span>
                            <span style={{ color: '#B1D34B' }}>Eventos</span>
                        </h1>
                        <p style={{ color: '#868e96', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Acesso ao Sistema</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--basic-gray-700)', fontSize: '0.9rem', fontWeight: '600' }}>Usuário</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '6px',
                                border: '1px solid #ced4da',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#00995D'}
                            onBlur={(e) => e.target.style.borderColor = '#ced4da'}
                            placeholder="Digite seu usuário"
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--basic-gray-700)', fontSize: '0.9rem', fontWeight: '600' }}>Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '6px',
                                border: '1px solid #ced4da',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#00995D'}
                            onBlur={(e) => e.target.style.borderColor = '#ced4da'}
                            placeholder="Digite sua senha"
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '0.9rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#00995D',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0, 153, 93, 0.3)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = '#004E4C';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#00995D';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        Entrar ➜
                    </button>
                </form>
            </div>

            <MessageModal
                isOpen={modal.open}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onClose={() => setModal({ ...modal, open: false })}
            />
        </div>
    );
}

export default Login;
