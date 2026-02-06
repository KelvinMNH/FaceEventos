const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RegistroAcesso = sequelize.define('RegistroAcesso', {
    tipo_acesso: { type: DataTypes.ENUM('entrada', 'saida'), allowNull: false },
    status_validacao: { type: DataTypes.ENUM('sucesso', 'falha', 'nao_encontrado'), allowNull: false },
    device_id: { type: DataTypes.STRING(50) },
    responsavel_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    indexes: [
        { fields: ['EventoId'] },
        { fields: ['ParticipanteId'] },
        { fields: ['AcompanhanteId'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = RegistroAcesso;
