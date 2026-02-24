import React from 'react';

function ModalMensagem({ isOpen, onClose, title, message, type = 'info', onConfirm, confirmText = 'OK', cancelText = 'Cancelar', showCancel = false }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" style={{ zIndex: 5000 }} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
                <h2 className="modal-header" style={{ color: type === 'error' ? 'var(--error-color)' : 'var(--text-primary)', marginBottom: '1rem' }}>
                    {title}
                </h2>
                <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    {message}
                </p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    {showCancel && (
                        <button className="btn-secondary" onClick={onClose}>{cancelText}</button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        style={{ backgroundColor: type === 'error' ? 'var(--error-color)' : 'var(--accent-color)', minWidth: '100px' }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalMensagem;

