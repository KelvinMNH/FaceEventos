const { Usuario, sequelize } = require('../models');

/**
 * AuthService
 * Centraliza a lógica de autenticação.
 * Preparado para alternar entre autenticação local e Active Directory.
 */
class AuthService {
    constructor() {
        this.strategy = process.env.AUTH_STRATEGY || 'local';
    }

    /**
     * Autentica um usuário baseado na estratégia configurada
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, user?: object, msg?: string}>}
     */
    async authenticate(username, password) {
        if (this.strategy === 'ad') {
            return this._authenticateAD(username, password);
        }
        return this._authenticateLocal(username, password);
    }

    /**
     * Autenticação Local via Banco de Dados (Bcrypt)
     */
    async _authenticateLocal(username, password) {
        try {
            // Busca usuário (Case-insensitive para o Oracle)
            const user = await Usuario.findOne({ 
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), username.toLowerCase()) 
            });

            if (!user) {
                return { success: false, msg: 'Usuário ou senha inválidos' };
            }

            // Verifica senha hashada
            const valid = await user.checkPassword(password);
            if (!valid) {
                return { success: false, msg: 'Usuário ou senha inválidos' };
            }

            return { 
                success: true, 
                user: {
                    id: user.id,
                    nome: user.nome,
                    username: user.username,
                    perfil: user.perfil
                } 
            };
        } catch (error) {
            console.error("Erro no AuthService (Local):", error);
            throw error;
        }
    }

    /**
     * Autenticação via Active Directory (Placeholder para implementação futura)
     */
    async _authenticateAD(username, password) {
        // TODO: Implementar lógica LDAP/AD aqui no futuro
        // 1. Criar conexão LDAP
        // 2. Tentar Bind com username/password
        console.log(`[AD Auth] Tentativa de login para: ${username}`);
        return { success: false, msg: 'Autenticação AD ainda não configurada' };
    }
}

module.exports = new AuthService();
