/**
 * api.js - Serviço Centralizado de Comunicação com a API
 * 
 * Em Homologação/Produção, usamos rotas relativas ("/api") que são 
 * interceptadas e roteadas pelo Nginx para o container de backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let onUnauthorizedCallback = null;

export const apiService = {
    /**
     * Permite registrar uma função a ser chamada quando houver erro 401
     */
    setUnauthorizedCallback(fn) {
        onUnauthorizedCallback = fn;
    },

    /**
     * Wrapper genérico para fetch com suporte a Token
     */
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            // Detecta expiração de sessão (401)
            if (response.status === 401 && onUnauthorizedCallback) {
                console.warn("[API] Sessão expirada detectada. Chamando callback de logout...");
                onUnauthorizedCallback();
            }

            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json().catch(() => ({ msg: "Erro ao ler JSON da resposta" }));
            } else {
                // Se não for JSON (ex: erro 500 HTML ou SPA index.html), retorna erro amigável
                data = { 
                    msg: "O servidor não retornou um JSON válido.",
                    status: response.status 
                };
            }
            
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            return {
                ok: false,
                status: 500,
                error: error.message
            };
        }
    },

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

export default apiService;
