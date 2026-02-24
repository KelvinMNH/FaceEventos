import React from 'react';

const ModalConfirmacao = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                transform: 'scale(1)',
                animation: 'scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <h3 style={{
                    marginTop: 0,
                    color: '#111827',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '1rem'
                }}>
                    {title}
                </h3>
                <p style={{
                    color: '#4b5563',
                    fontSize: '1rem',
                    lineHeight: '1.5',
                    marginBottom: '2rem'
                }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'transparent',
                                color: '#374151',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isDanger ? '#ef4444' : '#2563eb',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 600,
                            boxShadow: isDanger ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = isDanger ? '0 6px 16px rgba(239, 68, 68, 0.4)' : '0 6px 16px rgba(37, 99, 235, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = isDanger ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ModalConfirmacao;

