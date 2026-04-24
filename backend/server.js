const express = require('express');
const cors = require('cors');
const { syncDB } = require('./src/models');
const routes = require('./src/routes');
const logger = require('./src/utils/logger');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de Segurança
app.use(helmet());

// Configuração do CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // Em homologação, deve ser setado no .env
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate Limiting Global (100 requisições por 15 minutos por IP)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { msg: "Muitas requisições vindas deste IP, tente novamente mais tarde." }
});
app.use('/api/', globalLimiter);

// Rate Limiting Específico para Login (5 tentativas por 15 minutos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { msg: "Muitas tentativas de login. Tente novamente em 15 minutos." }
});
app.use('/api/login', loginLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuração do Morgan para logar requisições HTTP usando o Winston
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Rotas da API
app.use('/api', routes);

const startServer = async () => {
    try {
        // Inicializar Banco e Seed
        await syncDB();

        // Inicializar Serviço de Limpeza de Registros de Teste
        const CleanupService = require('./src/services/CleanupService');
        CleanupService.init();

        const fs = require('fs');
        const https = require('https');
        
        const sslKeyPath = process.env.SSL_KEY;
        const sslCrtPath = process.env.SSL_CRT;
        
        if (sslKeyPath && sslCrtPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCrtPath)) {
            const httpsOptions = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCrtPath)
            };
            
            https.createServer(httpsOptions, app).listen(PORT, () => {
                logger.info(`🔒 Servidor HTTPS pronto na porta ${PORT}`);
                logger.info(`📍 API Base: https://localhost:${PORT}/api`);
            });
        } else {
            app.listen(PORT, () => {
                logger.info(`🚀 Servidor HTTP pronto na porta ${PORT} (Sem SSL)`);
                logger.info(`📍 API Base: http://localhost:${PORT}/api`);
            });
        }

    } catch (error) {
        logger.error('❌ Erro ao iniciar o servidor (syncDB ignorado):', error);
        // Fallback simple listen for recovery mode
        app.listen(PORT, () => {
            logger.info(`🚀 Servidor pronto na porta ${PORT} (Modo de Recuperação)`);
            logger.info(`📍 API Base: http://localhost:${PORT}/api`);
        });
    }
};

startServer();
