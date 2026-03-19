const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../backend/database.sqlite'),
    logging: console.log
});

async function run() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('Participantes');
        
        if (!tableInfo.foto_biometria) {
            console.log('Adicionando coluna foto_biometria...');
            await queryInterface.addColumn('Participantes', 'foto_biometria', {
                type: DataTypes.TEXT('long'),
                allowNull: true
            });
            console.log('✅ Coluna foto_biometria adicionada com sucesso.');
        } else {
            console.log('ℹ️ Coluna foto_biometria já existe.');
        }
    } catch (e) {
        console.error('❌ Erro:', e.message);
    } finally {
        await sequelize.close();
    }
}

run();
