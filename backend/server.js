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

// Inicialização do servidor
const startServer = async () => {
    try {
        // Inicializar Banco e Seed
        await syncDB();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor pronto na porta ${PORT}`);
            console.log(`📍 API Base: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
};

startServer();
