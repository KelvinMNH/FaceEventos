const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HistoricoSincronizacao = sequelize.define('HistoricoSincronizacao', {
    data_sync: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    total_participantes: { type: DataTypes.INTEGER, defaultValue: 0 },
    qtd_adicionados: { type: DataTypes.INTEGER, defaultValue: 0 },
    qtd_modificados: { type: DataTypes.INTEGER, defaultValue: 0 },
    qtd_removidos: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('sucesso', 'erro'), defaultValue: 'sucesso' },
    detalhes_erro: { type: DataTypes.TEXT } // Para armazenar possível erro de rede
});

module.exports = HistoricoSincronizacao;
