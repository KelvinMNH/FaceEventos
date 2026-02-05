const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participante = sequelize.define('Participante', {
    nome: { type: DataTypes.STRING, allowNull: false },
    documento: { type: DataTypes.STRING },
    cpf: { type: DataTypes.STRING },
    crm: { type: DataTypes.STRING },
    template_biometrico: { type: DataTypes.TEXT },
    genero: { type: DataTypes.ENUM('M', 'F', 'Outro'), defaultValue: 'Outro' },
    data_nascimento: { type: DataTypes.DATEONLY },
    categoria: { type: DataTypes.ENUM('Medico', 'Outros'), defaultValue: 'Outros' },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Participante;
