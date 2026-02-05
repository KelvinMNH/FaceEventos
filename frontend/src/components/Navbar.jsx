import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ children, onOpenCreateModal }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

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
                                src="/logo3.png"
                                alt="Logo FaceEventos"
                                className="navbar-logo"
                            />
                            <h1 className="navbar-title" style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '0' }}>
                                <span style={{ color: 'white' }}>Face</span>
                                <span style={{ color: '#ff6600' }}>Eventos</span>
                            </h1>
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
                        onClick={handleCreateClick}
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

                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/register' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/register'); }}
                    >
                        Cadastro Facial
                    </a>

                    <a
                        href="#"
                        className={`sidebar-link ${location.pathname === '/participants' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); handleNavigate('/participants'); }}
                    >
                        Lista de Cadastrados
                    </a>



                    {/* Espaço para futuros links */}
                </div>
            </div>
        </>
    );
}

export default Navbar;
