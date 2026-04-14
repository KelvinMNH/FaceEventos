import React from 'react';

/**
 * Componente de Cabeçalho (Topbar) do Totem
 */
export const TotemTopbar = ({ title, evento, horaAtual, formatDate, formatTime }) => (
    <div className="totem-topbar" style={{ 
        backgroundColor: '#00995D', 
        color: 'white', 
        padding: '1rem 2.5rem', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        alignItems: 'center', 
        boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
        zIndex: 10
    }}>
        {/* Lado Esquerdo: Marca e Evento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{evento ? evento.nome : 'Carregando...'}</div>
                {evento && (
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, display: 'flex', gap: '1rem', marginTop: '4px' }}>
                        <span>📅 {new Date(evento.data_inicio).toLocaleDateString('pt-BR')}</span>
                        <span>📍 {evento.local}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Centro: Título do Totem */}
        <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {title}
            </h1>
        </div>

        {/* Lado Direito: Relógio */}
        <div style={{ textAlign: 'right', lineHeight: '1' }}>
            <div style={{ fontSize: '5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatTime(horaAtual)}</div>
            <div style={{ fontSize: '1.5rem', marginTop: '2px', opacity: 0.9 }}>{formatDate(horaAtual)}</div>
        </div>
    </div>
);

/**
 * Componente de Layout Base do Totem
 */
export const TotemLayout = ({ children, ...topbarProps }) => (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflowY: 'auto', overflowX: 'hidden' }}>
        <TotemTopbar {...topbarProps} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', minHeight: 'min-content' }}>
            {children}
        </div>
        <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        `}</style>
    </div>
);
