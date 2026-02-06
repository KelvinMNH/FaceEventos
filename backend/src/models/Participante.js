const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participante = sequelize.define('Participante', {
    nome: { type: DataTypes.STRING(255), allowNull: false },
    cpf: { type: DataTypes.STRING(14), unique: true, allowNull: false },
    crm: { type: DataTypes.STRING(20), unique: true },
    template_biometrico: { type: DataTypes.TEXT },
    genero: { type: DataTypes.ENUM('M', 'F', 'Outro'), defaultValue: 'Outro' },
    data_nascimento: { type: DataTypes.DATEONLY },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    indexes: [
        { unique: true, fields: ['cpf'] },
        { unique: true, fields: ['crm'] },
        { fields: ['nome'] }
    ]
});

module.exports = Participante;
