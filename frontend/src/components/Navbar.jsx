import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleNavigate = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="menu-btn" onClick={toggleMenu} aria-label="Abrir menu">
                            ☰
                        </button>

                        {location.pathname !== '/' && (
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    marginRight: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0'
                                }}
                                title="Voltar"
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                        )}

                        <div
                            onClick={() => navigate('/')}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
                        >
                            <img
                                src="/logo.jpg"
                                alt="Logo UniEventos"
                                style={{ height: '40px', backgroundColor: 'white', padding: '2px', borderRadius: '4px' }}
                            />
                            <h1 className="navbar-title">UniEventos</h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                        {children}
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
                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}
                    >
                        Lista de Eventos
                    </a>

                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/create' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/create'); }}
                    >
                        Novo Evento
                    </a>

                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/access' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/access'); }}
                    >
                        Painel de Controle
                    </a>

                    {/* Espaço para futuros links */}
                </div>
            </div>
        </>
    );
}

export default Navbar;
