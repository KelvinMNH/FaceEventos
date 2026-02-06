const { sequelize } = require('./src/models');

async function cleanup() {
    try {
        console.log("🧹 Iniciando limpeza de tabelas obsoletas...");

        // Drop nas possíveis variações de nome
        await sequelize.query("DROP TABLE IF EXISTS evento_backup");
        await sequelize.query("DROP TABLE IF EXISTS Evento_backup");
        await sequelize.query("DROP TABLE IF EXISTS eventos_backup");
        await sequelize.query("DROP TABLE IF EXISTS Eventos_backup");

        console.log("✅ Tabelas de backup removidas (se existiam).");

        // Verificar tabelas restantes
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tabelas atuais no banco:", results.map(r => r.name));

    } catch (e) {
        console.error("❌ Erro ao limpar tabelas:", e.message);
    } finally {
        process.exit();
    }
}

cleanup();
