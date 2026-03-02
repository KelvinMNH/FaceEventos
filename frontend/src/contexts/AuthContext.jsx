import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifySession = async () => {
            if (!token) {
                console.log("[Auth] Sem token, parando carregamento");
                setLoading(false);
                return;
            }

            console.log("[Auth] Validando sessão...");
            setLoading(true); // Garante que está "carregando" durante a validação

            try {
                const res = await fetch('http://localhost:3000/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log("[Auth] Resposta /me status:", res.status);

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        console.log("[Auth] Sessão válida para:", data.user.username);
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    } else {
                        console.warn("[Auth] /me retornou sucesso=false", data);
                        logout();
                    }
                } else {
                    console.warn("[Auth] Sessão inválida (401/outros), deslogando...");
                    logout();
                }
            } catch (error) {
                console.error("[Auth] Erro ao validar sessão:", error);
                // Em erro de rede, vamos manter logado por enquanto para evitar deslogar por instabilidade
                // mas se o erro persistir, o usuário verá erros em outras requisições
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, [token]);

    const login = async (username, password) => {
        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
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

    const isAdmin = () => user?.perfil === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
