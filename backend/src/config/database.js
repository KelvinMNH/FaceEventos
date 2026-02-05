const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let sequelize;

if (process.env.DB_DIALECT === 'oracle') {
    sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'oracle',
        logging: false,
        dialectOptions: {
            connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`
        }
    });
    console.log('📦 Banco de Dados: Conectado ao Oracle');
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../database.sqlite'),
        logging: false
    });
    console.log('📦 Banco de Dados: Conectado ao SQLite');
}

module.exports = sequelize;
