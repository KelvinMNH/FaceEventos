import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import io from 'socket.io-client';

// Conexão Socket (Fora do componente para evitar recriação)
const socket = io('http://localhost:3000');

function Sorteios() {
    const [status, setStatus] = useState('parado'); // parado, rodando, finalizado
    const [vencedor, setVencedor] = useState(null);
    const [totalParticipantes, setTotalParticipantes] = useState(0);
    const [restantes, setRestantes] = useState(0);
    const [usarApenasPresentes, setUsarApenasPresentes] = useState(true);

    const canvasRef = useRef(null);
    const ticketsRef = useRef([]); // Referência mutável para animação sem re-render
    const animationRef = useRef(null);

    // --- CONFIGURAÇÃO DE CORES (Baseada no Projeto) ---
    const COLORS = {
        vivo: '#0d6efd',       // Azul (Bootstrap Primary)
        eliminado: '#e9ecef',   // Cinza Claro
        vencedor: '#198754'     // Verde (Bootstrap Success)
    };

    useEffect(() => {
        // Listeners Socket
        socket.on('sorteio-preparar', (data) => {
            console.log("Preparando sorteio:", data.tickets.length);
            ticketsRef.current = data.tickets.map(t => ({
                ...t,
                status: 'vivo',
                x: 0, y: 0, size: 0 // Será calculado no draw
            }));
            setTotalParticipantes(data.tickets.length);
            setRestantes(data.tickets.length);
            setStatus('preparando');
            setVencedor(null);
            drawCanvas();
        });

        socket.on('sorteio-inicio', () => {
            console.log("Sorteio iniciado!");
            setStatus('rodando');
        });

        socket.on('sorteio-eliminacao', ({ eliminado, restantes }) => {
            // Atualizar estado visual do ticket eliminado
            const ticket = ticketsRef.current.find(t => t.numero === eliminado);
            if (ticket) {
                ticket.status = 'eliminado';
            }
            setRestantes(restantes);
            requestAnimationFrame(drawCanvas); // Redesenhar Apenas quando necessário
        });

        socket.on('sorteio-fim', ({ vencedor }) => {
            console.log("Vencedor:", vencedor);
            const ticket = ticketsRef.current.find(t => t.numero === vencedor.numero);
            if (ticket) ticket.status = 'vencedor';

            setVencedor(vencedor);
            setStatus('finalizado');
            drawCanvas();
        });

        socket.on('erro-sorteio', (msg) => {
            alert(msg);
            setStatus('parado');
        });

        return () => {
            socket.off('sorteio-preparar');
            socket.off('sorteio-inicio');
            socket.off('sorteio-eliminacao');
            socket.off('sorteio-fim');
            socket.off('erro-sorteio');
        };
    }, []);

    // --- FUNÇÃO DE DESENHO (Canvas) ---
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Limpar
        ctx.clearRect(0, 0, width, height);

        const count = ticketsRef.current.length;
        if (count === 0) return;

        // Calcular Grid Otimizado (Quadrado mais próximo)
        const cols = Math.ceil(Math.sqrt(count * (width / height)));
        const rows = Math.ceil(count / cols);

        const gap = 2; // Espaçamento entre blocos
        const cellW = (width - (cols - 1) * gap) / cols;
        const cellH = (height - (rows - 1) * gap) / rows;

        ticketsRef.current.forEach((ticket, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = c * (cellW + gap);
            const y = r * (cellH + gap);

            // Cor baseada no status
            if (ticket.status === 'vivo') {
                ctx.fillStyle = COLORS.vivo;
            } else if (ticket.status === 'vencedor') {
                ctx.fillStyle = COLORS.vencedor;
            } else {
                ctx.fillStyle = COLORS.eliminado;
            }

            // Desenhar Retângulo
            ctx.fillRect(x, y, cellW, cellH);

            // Desenhar Texto (Só se couber)
            if (cellW > 20) {
                ctx.fillStyle = ticket.status === 'vivo' || ticket.status === 'vencedor' ? '#fff' : '#999';
                ctx.font = `bold ${Math.min(cellW * 0.4, 14)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ticket.numero, x + cellW / 2, y + cellH / 2);
            }
        });
    };

    // Redimensionar Canvas
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
                canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
                drawCanvas();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Init
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // --- COMANDOS ---
    const iniciarSorteio = () => {
        socket.emit('iniciar-sorteio', { usarApenasPresentes, force: true });
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-color)', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            {/* Header de Controle */}
            <div style={{ padding: '1rem', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>Sorteio Battle Royale</h2>

                {status === 'parado' && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={usarApenasPresentes}
                                onChange={(e) => setUsarApenasPresentes(e.target.checked)}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>Apenas Presentes (Check-in)</span>
                        </label>
                        <button
                            onClick={iniciarSorteio}
                            style={{
                                padding: '0.6rem 1.5rem',
                                backgroundColor: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            ▶ Iniciar Sorteio
                        </button>
                    </div>
                )}

                {status !== 'parado' && (
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        Restantes: <span style={{ color: COLORS.vivo }}>{restantes}</span> / {totalParticipantes}
                    </div>
                )}
            </div>

            {/* Área Principal (Canvas + Vencedor) */}
            <div style={{ flex: 1, position: 'relative', padding: '1rem', overflow: 'hidden' }}>

                {/* Canvas Container */}
                <div style={{ width: '100%', height: '100%', minHeight: '400px', backgroundColor: '#f8f9fa', borderRadius: '8px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)' }}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </div>

                {/* Overlay Vencedor */}
                {status === 'finalizado' && vencedor && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', zIndex: 10,
                        animation: 'fadeIn 0.5s ease-out'
                    }}>
                        <h1 style={{ fontSize: '3rem', color: '#b1d249', marginBottom: '1rem' }}>🎉 TEMOS UM VENCEDOR! 🎉</h1>

                        <div style={{
                            backgroundColor: '#fff',
                            padding: '2rem',
                            borderRadius: '15px',
                            textAlign: 'center',
                            color: '#333',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 0 50px rgba(177, 210, 73, 0.5)'
                        }}>
                            {vencedor.foto ? (
                                <img src={vencedor.foto} alt="Foto" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '5px solid #b1d249', marginBottom: '1rem' }} />
                            ) : (
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#eee', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>👤</div>
                            )}

                            <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{vencedor.nome}</h2>
                            <p style={{ fontSize: '1.2rem', color: '#666' }}>Número da Sorte: <strong>{vencedor.numero}</strong></p>
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                <small>CPF Final: {vencedor.cpf ? vencedor.cpf.slice(-2) : '**'} | ID: {vencedor.id}</small>
                            </div>

                            <button
                                onClick={() => setStatus('parado')}
                                style={{ marginTop: '2rem', padding: '0.8rem 2rem', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '1.1rem', cursor: 'pointer' }}
                            >
                                Novo Sorteio
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

export default Sorteios;
