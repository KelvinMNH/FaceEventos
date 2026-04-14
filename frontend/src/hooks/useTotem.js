import { useState, useEffect } from 'react';
import apiService from '../services/api';

/**
 * Hook para gerenciar o relógio em tempo real
 */
export function useClock() {
    const [horaAtual, setHoraAtual] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formatTime = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return { horaAtual, formatDate, formatTime };
}

/**
 * Hook para buscar dados do evento ativo
 */
export function useActiveEvent(token, uuid, onSetView) {
    const [evento, setEvento] = useState(null);

    useEffect(() => {
        const fetchEvento = async () => {
            if (!token || !uuid) return;
            try {
                const { data } = await apiService.get(`/eventos/${uuid}`, token);
                if (data) setEvento(data);
                else if (onSetView) onSetView('error');
            } catch (e) {
                console.error(e);
                if (onSetView) onSetView('error');
            }
        };
        fetchEvento();
    }, [token, uuid, onSetView]);

    return { evento };
}

/**
 * Hook para gerenciar a barra de progresso e expiração do resultado biométrico
 */
export function useBiometricProgress(result, view, onReset, duration = 5000) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        let timer;
        if (result && view === 'welcome') {
            setProgress(100);
            const startTime = Date.now();

            timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);
                if (elapsed >= duration) {
                    onReset();
                    clearInterval(timer);
                }
            }, 50);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [result, view, onReset, duration]);

    return progress;
}
