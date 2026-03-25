import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar({ children, onOpenCreateModal }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { user, logout, isAdmin } = useAuth();

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleNavigate = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    const handleCreateClick = (e) => {
        e.preventDefault();
        setIsOpen(false);
        if (onOpenCreateModal) {
            onOpenCreateModal();
        } else {
            navigate('/', { state: { openModal: true } });
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="menu-btn" onClick={toggleMenu} aria-label="Abrir menu">
                            ☰
                        </button>

                        <div
                            onClick={() => navigate('/')}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
                        >
                            <img
                                src="/logo.png"
                                alt="Logo UniEventos"
                                style={{ height: '40px' }}
                            />
                            <h1 className="navbar-title" style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '0' }}>
                                <span style={{ color: 'white' }}>Uni</span>
                                <span style={{ color: '#B1D34B' }}>Eventos</span>
                            </h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {children}

                        {user && (
                            <div style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{
                                        width: '35px',
                                        height: '35px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        color: 'var(--accent-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem'
                                    }}>
                                        {user.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ color: 'white', fontSize: '0.9rem', display: 'flex', flexDirection: 'column' }}>
                                        <strong>{user.nome}</strong>
                                    </span>
                                </div>

                                {userMenuOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '120%',
                                            right: 0,
                                            background: 'white',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            padding: '0.5rem',
                                            minWidth: '150px',
                                            zIndex: 101,
                                            animation: 'fadeIn 0.2s ease'
                                        }}>
                                            <button
                                                onClick={handleLogout}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    color: '#cf222e',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    fontSize: '0.95rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontWeight: '600'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#fff5f5'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                Sair
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Content */}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Menu</h2>
                    <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                </div>

                <div className="sidebar-links">
                    {isAdmin() && (
                        <a
                            href="#"
                            className={`sidebar-link ${location.pathname === '/create' ? 'active' : ''}`}
                            onClick={handleCreateClick}
                        >
                            Novo Evento
                        </a>
                    )}

                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}
                    >
                        Lista de Eventos
                    </a>


                    {isAdmin() && (
                        <a
                            href="#"
                            className={`sidebar-link ${location.pathname === '/admin/participantes' ? 'active' : ''}`}
                            onClick={(e) => { e.preventDefault(); handleNavigate('/admin/participantes'); }}
                        >
                            Controle de participantes
                        </a>
                    )}

                    <a
                        href="#"
                        className="sidebar-link"
                        onClick={(e) => { e.preventDefault(); handleLogout(); }}
                    >
                        Sair
                    </a>
                </div>
            </div>
        </>
    );
}

export default Navbar;
