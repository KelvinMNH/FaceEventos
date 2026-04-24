const sequelize = require('../config/database');
const Evento = require('./Evento');
const Participante = require('./Participante');
const Acompanhante = require('./Acompanhante');
const RegistroAcesso = require('./RegistroAcesso');
const Usuario = require('./Usuario');
const LogAuditoria = require('./LogAuditoria');
const HistoricoSincronizacao = require('./HistoricoSincronizacao');

// Relacionamentos
Evento.hasMany(RegistroAcesso, { onDelete: 'CASCADE' });
RegistroAcesso.belongsTo(Evento);

Participante.hasMany(RegistroAcesso, { onDelete: 'CASCADE' });
RegistroAcesso.belongsTo(Participante);

Participante.hasMany(Acompanhante, { onDelete: 'CASCADE' });
Acompanhante.belongsTo(Participante);

Acompanhante.hasMany(RegistroAcesso, { onDelete: 'CASCADE' });
RegistroAcesso.belongsTo(Acompanhante);

Usuario.hasMany(LogAuditoria, { foreignKey: 'usuario_id' });
LogAuditoria.belongsTo(Usuario, { foreignKey: 'usuario_id' });

async function syncDB() {
    try {
        // Alterado para false para garantir a integridade do schema
        // Se precisar alterar schema, use migration ou ative manualmente
        await sequelize.sync({ force: false });
        console.log("Banco de dados Oracle preservado e sincronizado.");
    } catch (error) {
        console.error("Erro ao sincronizar banco de dados:", error);
    }


    // Seed de Usuários
    const usuarioCount = await Usuario.count();
    if (usuarioCount === 0) {
        console.log("Criando usuarios iniciais...");
        await Usuario.bulkCreate([
            {
                nome: 'Administrador',
                username: 'admin',
                password: 'admin123', // Será hashado pelo hook
                perfil: 'admin'
            },
            {
                nome: 'Operador',
                username: 'operador',
                password: 'operador123', // Será hashado pelo hook
                perfil: 'operador'
            }
        ], { individualHooks: true }); // Necessário para disparar o beforeCreate/beforeUpdate e criar o hash
        console.log("Usuarios Admin e Operador criados.");
    }
}

module.exports = {
    sequelize,
    Evento,
    Participante,
    Acompanhante,
    RegistroAcesso,
    Usuario,
    LogAuditoria,
    HistoricoSincronizacao,
    syncDB
};
