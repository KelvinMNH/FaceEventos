const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'idx_u_username'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    perfil: {
        type: DataTypes.ENUM('admin', 'operador'),
        allowNull: false,
        defaultValue: 'operador'
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password && user.password.trim() !== "") {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password') && user.password && user.password.trim() !== "") {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

// Método para verificar senha
Usuario.prototype.checkPassword = async function (password) {
    if (!this.password) return false; // Se não tem senha (usuário AD puro), não valida localmente
    return await bcrypt.compare(password, this.password);
};

module.exports = Usuario;
