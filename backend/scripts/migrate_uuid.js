const { sequelize, Evento } = require('../src/models');
const { v4: uuidv4 } = require('uuid');

async function migrate() {
    try {
        console.log("🚀 Iniciando migração de UUID...");

        // 1. Verificar se a coluna já existe
        const [results] = await sequelize.query("PRAGMA table_info(Eventos)");
        const hasUuid = results.some(column => column.name === 'uuid');

        if (!hasUuid) {
            console.log("➕ Adicionando coluna 'uuid' à tabela Eventos...");
            // Em SQLite, precisamos adicionar como opcional primeiro se houver dados
            await sequelize.query("ALTER TABLE Eventos ADD COLUMN uuid CHAR(36)");
        } else {
            console.log("ℹ️ Coluna 'uuid' já existe.");
        }

        // 2. Preencher UUIDs nulos
        const eventos = await Evento.findAll();
        let updatedCount = 0;

        for (const evento of eventos) {
            if (!evento.uuid) {
                evento.uuid = uuidv4();
                await evento.save();
                updatedCount++;
            }
        }

        console.log(`✅ Migração concluída! ${updatedCount} eventos atualizados.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro na migração:", error);
        process.exit(1);
    }
}

migrate();
