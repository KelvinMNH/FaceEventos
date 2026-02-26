const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LogAuditoria = sequelize.define('LogAuditoria', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    acao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    detalhes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'log_auditorias',
    timestamps: true // Creates createdAt and updatedAt
});

module.exports = LogAuditoria;
