const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

async function migrate() {
    const storage = path.join(__dirname, 'database.sqlite');
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storage,
        logging: console.log
    });

    try {
        console.log('🚀 Iniciando migração para remover coluna "documento"...');

        // 1. Desabilitar chaves estrangeiras temporariamente
        await sequelize.query('PRAGMA foreign_keys = OFF');

        // 2. Verificar se a coluna existe
        const [columns] = await sequelize.query("PRAGMA table_info(Participantes)");
        const hasDocumento = columns.some(c => c.name === 'documento');

        if (!hasDocumento) {
            console.log('✅ Coluna "documento" não encontrada. Nada a migrar.');
            return;
        }

        // 3. Criar nova tabela sem a coluna documento
        // Pegamos a definição do modelo atual (sem documento)
        const ParticipanteDef = {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            nome: { type: DataTypes.STRING, allowNull: false },
            cpf: { type: DataTypes.STRING },
            crm: { type: DataTypes.STRING },
            template_biometrico: { type: DataTypes.TEXT },
            genero: { type: DataTypes.TEXT }, // SQLite mapeia ENUM pra TEXT
            data_nascimento: { type: DataTypes.DATEONLY },
            categoria: { type: DataTypes.TEXT },
            ativo: { type: DataTypes.BOOLEAN },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        };

        await sequelize.queryInterface.createTable('Participantes_new', ParticipanteDef);

        // 4. Copiar dados
        await sequelize.query(`
            INSERT INTO Participantes_new (id, nome, cpf, crm, template_biometrico, genero, data_nascimento, categoria, ativo, createdAt, updatedAt)
            SELECT id, nome, cpf, crm, template_biometrico, genero, data_nascimento, categoria, ativo, createdAt, updatedAt
            FROM Participantes
        `);

        // 5. Trocar tabelas
        await sequelize.query('DROP TABLE Participantes');
        await sequelize.query('ALTER TABLE Participantes_new RENAME TO Participantes');

        // 6. Reabilitar chaves estrangeiras
        await sequelize.query('PRAGMA foreign_keys = ON');

        console.log('✨ Migração concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
