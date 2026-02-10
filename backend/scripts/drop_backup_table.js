const sequelize = require('../src/config/database');

async function dropBackupTable() {
    try {
        await sequelize.authenticate();
        console.log('Conexão estabelecida com sucesso.');

        // Tenta dropar a tabela
        await sequelize.query('DROP TABLE IF EXISTS "eventos_BACKUP";'); // Aspas para garantir case sensitivity se necessário, mas geralmente SQL é ok.
        // Tenta também sem aspas por garantia
        await sequelize.query('DROP TABLE IF EXISTS eventos_BACKUP;');

        console.log('Tabela eventos_BACKUP removida com sucesso (se existia).');
    } catch (error) {
        console.error('Erro ao remover tabela:', error);
    } finally {
        await sequelize.close();
    }
}

dropBackupTable();
