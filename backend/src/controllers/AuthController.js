const { Usuario, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const AuthService = require('../services/AuthService');
const SyncParticipantesService = require('../services/SyncParticipantesService');

// Usar variável de ambiente para SECRET ou default para dev
const JWT_SECRET = process.env.JWT_SECRET || 'unieventos_secret_key_123';
if (JWT_SECRET === 'unieventos_secret_key_123') {
    console.warn('⚠️ AVISO DE SEGURANÇA: JWT_SECRET usando chave padrão. Altere para o ambiente de homologação/produção.');
}

class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Delegar autenticação para o serviço
            const auth = await AuthService.authenticate(username, password);

            if (!auth.success) {
                return res.status(401).json({ success: false, msg: auth.msg });
            }

            const user = auth.user;

            // Gera Token
            const token = jwt.sign(
                { id: user.id, username: user.username, perfil: user.perfil, nome: user.nome },
                JWT_SECRET,
                { expiresIn: '12h' }
            );

            // Dispara sincronização em background (não aguarda terminar para responder)
            SyncParticipantesService.sync().catch(err => console.error("Erro na sync assíncrona:", err));

            // Retorna dados (sem senha)
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    username: user.username,
                    perfil: user.perfil
                }
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, msg: 'Erro no login' });
        }
    }

    // Retorna dados do usuário logado (validação de token)
    async me(req, res) {
        try {
            // req.user já foi preenchido pelo middleware verifyToken
            res.json({
                success: true,
                user: req.user
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, msg: 'Erro ao obter dados do usuário' });
        }
    }

    // Middleware para verificar Token
    verifyToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

        if (!token) return res.status(401).json({ msg: 'Acesso negado. Token não fornecido.' });

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(401).json({ msg: 'Sessão expirada ou inválida' }); 



            // Garantir que temos os dados básicos
            req.user = {
                id: decoded.id,
                username: decoded.username,
                perfil: decoded.perfil,
                nome: decoded.nome
            };
            next();
        });
    }

    // Middleware para verificar permissão Admin
    requireAdmin(req, res, next) {
        if (!req.user || req.user.perfil !== 'admin') {
            return res.status(403).json({ msg: 'Acesso restrito a administradores.' });
        }
        next();
    }
}

module.exports = new AuthController();
