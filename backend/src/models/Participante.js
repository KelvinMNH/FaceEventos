const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participante = sequelize.define('Participante', {
    nome: { type: DataTypes.STRING(255), allowNull: false },
    cpf: { type: DataTypes.STRING(20), allowNull: false },
    crm: { type: DataTypes.STRING(20) },
    template_biometrico: { type: DataTypes.TEXT('long') },
    genero: { type: DataTypes.ENUM('M', 'F', 'O'), defaultValue: 'O' },
    data_nascimento: { type: DataTypes.DATEONLY },
    especialidade: { type: DataTypes.STRING(255) },
    data_biometria: { type: DataTypes.DATE },
    foto_biometria: { type: DataTypes.TEXT('long') },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    hooks: {
        beforeSave: (participante) => {
            if (participante.cpf) {
                participante.cpf = String(participante.cpf).replace(/\D/g, '');
            }
            if (participante.crm) {
                participante.crm = String(participante.crm).trim();
            }
        }
    },
    indexes: [
        { name: 'idx_p_cpf', unique: true, fields: ['cpf'] },
        { name: 'idx_p_crm', unique: true, fields: ['crm'] },
        { name: 'idx_p_nome', fields: ['nome'] }
    ]
});

module.exports = Participante;
