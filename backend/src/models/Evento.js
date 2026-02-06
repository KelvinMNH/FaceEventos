const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evento = sequelize.define('Evento', {
    nome: { type: DataTypes.STRING(255), allowNull: false },
    data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.STRING(5) },
    local: { type: DataTypes.STRING(255) },
    imagem: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('agendado', 'ativo', 'finalizado'), defaultValue: 'ativo' },
    permitir_acompanhantes: { type: DataTypes.BOOLEAN, defaultValue: false },
    max_acompanhantes: { type: DataTypes.INTEGER, defaultValue: 0 },
    habilitar_checkout: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Evento;
