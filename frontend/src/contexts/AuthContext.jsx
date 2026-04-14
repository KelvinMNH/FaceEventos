import React, { createContext, useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/api';

const AuthContext = createContext();

/**
 * Função utilitária para decodificar o payload do JWT sem bibliotecas externas
 */
const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

export const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(!!token);

    const verifyInProgress = React.useRef(false);
    const expirationTimerRef = React.useRef(null);

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            if (!token || verifyInProgress.current) {
                if (!token) setLoading(false);
                return;
            }

            // Se já temos user, não precisamos validar de novo imediatamente
            if (user) {
                setLoading(false);
                return;
            }

            verifyInProgress.current = true;
            
            try {
                // Pequeno delay para evitar inundação de rede em caso de re-render rápido
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (!isMounted) return;

                const { ok, data } = await apiService.get('/me');
                if (ok && data.success) {
                    if (isMounted) {
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                } else if (ok === false) {
                    if (isMounted) logout();
                }
            } catch (error) {
                console.error("[Auth Context] Verificação falhou:", error);
            } finally {
                if (isMounted) setLoading(false);
                verifyInProgress.current = false;
            }
        };

        verifySession();
        return () => { isMounted = false; };
    }, [token]); // Removido user daqui para evitar loop se setUser mudar a referência // Só re-valida se o token em si mudar (login/logout)

    const login = async (username, password) => {
        try {
            const { ok, data } = await apiService.post('/login', { username, password });

            if (ok && data.success) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, msg: data.msg || "Erro no login" };
            }
        } catch (error) {
            console.error("Erro no login:", error);
            return { success: false, msg: "Erro de conexão" };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    // Configura o auto-logoff no serviço de API (Interceptor de 401)
    useEffect(() => {
        apiService.setUnauthorizedCallback(logout);
        return () => apiService.setUnauthorizedCallback(null);
    }, []);

    // Configura o Cronômetro Proativo de Expiração
    useEffect(() => {
        // Limpa timer anterior se existir
        if (expirationTimerRef.current) {
            clearTimeout(expirationTimerRef.current);
            expirationTimerRef.current = null;
        }

        if (token) {
            const decoded = parseJwt(token);
            if (decoded && decoded.exp) {
                const expirationTime = decoded.exp * 1000;
                const timeLeft = expirationTime - Date.now();

                console.log(`[Auth] Sessão expira em ${Math.round(timeLeft / 1000 / 60)} minutos.`);

                if (timeLeft <= 0) {
                    console.warn("[Auth] Token já expirado. Deslogando...");
                    logout();
                } else {
                    // Agenda o logout para o momento exato da expiração
                    expirationTimerRef.current = setTimeout(() => {
                        console.warn("[Auth] Tempo de sessão esgotado (Timer). Redirecionando...");
                        logout();
                    }, timeLeft);
                }
            } else {
                // Token inválido ou sem expiração
                logout();
            }
        }

        return () => {
            if (expirationTimerRef.current) clearTimeout(expirationTimerRef.current);
        };
    }, [token]);

    const isAdmin = () => user?.perfil === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
