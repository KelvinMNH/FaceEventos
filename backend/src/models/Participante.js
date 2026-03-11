const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participante = sequelize.define('Participante', {
    nome: { type: DataTypes.STRING(255), allowNull: false },
    cpf: { type: DataTypes.STRING(11), unique: true, allowNull: false },
    crm: { type: DataTypes.STRING(20), unique: true },
    template_biometrico: { type: DataTypes.TEXT('long') },
    genero: { type: DataTypes.ENUM('M', 'F', 'O'), defaultValue: 'O' },
    data_nascimento: { type: DataTypes.DATEONLY },
    data_biometria: { type: DataTypes.DATE },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    indexes: [
        { unique: true, fields: ['cpf'] },
        { unique: true, fields: ['crm'] },
        { fields: ['nome'] }
    ]
});

module.exports = Participante;
