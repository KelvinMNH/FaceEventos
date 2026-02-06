const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Acompanhante = sequelize.define('Acompanhante', {
    nome: { type: DataTypes.STRING, allowNull: false }
});

module.exports = Acompanhante;
