const express = require('express');
const cors = require('cors');
const { syncDB } = require('./src/models');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rotas da API
app.use('/api', routes);

const startServer = async () => {
    try {
        // Inicializar Banco e Seed
        await syncDB();

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
                console.log(`🔒 Servidor HTTPS pronto na porta ${PORT}`);
                console.log(`📍 API Base: https://localhost:${PORT}/api`);
            });
        } else {
            app.listen(PORT, () => {
                console.log(`🚀 Servidor HTTP pronto na porta ${PORT} (Sem SSL)`);
                console.log(`📍 API Base: http://localhost:${PORT}/api`);
            });
        }

    } catch (error) {
        console.error('❌ Erro ao iniciar o servidor (syncDB ignorado):', error);
        // Fallback simple listen for recovery mode
        app.listen(PORT, () => {
            console.log(`🚀 Servidor pronto na porta ${PORT} (Modo de Recuperação)`);
            console.log(`📍 API Base: http://localhost:${PORT}/api`);
        });
    }
};

startServer();
