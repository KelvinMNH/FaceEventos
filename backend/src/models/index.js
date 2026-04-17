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
        console.log("✅ Banco de dados Oracle preservado e sincronizado.");
    } catch (error) {
        console.error("❌ Erro ao sincronizar banco de dados:", error);
    }

    const count = await Participante.count();
    if (count === 0) {
        console.log("🌱 Populando dados iniciais (Seed)...");
        const nomes = [
            'Kelvin Higino', 'João Silva', 'Maria Oliveira', 'Ana Santos', 'Pedro Costa',
            'Lucas Pereira', 'Juliana Lima', 'Fernanda Souza', 'Rafaela Alves', 'Gustavo Ribeiro',
            'Camila Rocha', 'Bruno Dias', 'Beatriz Martins', 'Guilherme Gomes', 'Larissa Ferreira',
            'Rodrigo Barbosa', 'Patrícia Lopes', 'Marcos Castro', 'Vanessa Moura', 'Thiago Mendes'
        ];

        const participants = nomes.map((nome, i) => {
            const isMedico = i % 3 === 0;
            const genero = i % 2 === 0 ? 'M' : 'F';
            const age = 20 + Math.floor(Math.random() * 40);
            const year = new Date().getFullYear() - age;
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

            const cpf = `${100 + i}.456.789-${String(i).padStart(2, '0')}`;
            const crm = isMedico ? `CRM/AL ${10000 + i}` : null;

            return {
                nome,
                // documento removido
                cpf,
                crm,
                template_biometrico: `bio_${i}`,
                genero,
                data_nascimento: `${year}-${month}-${day}`,
                ativo: true
            };
        });

        await Participante.bulkCreate(participants);

        const eventoCount = await Evento.count();
        if (eventoCount === 0) {
            await Evento.create({
                nome: 'UniEvento Tech 2026',
                data_inicio: new Date(),
                status: 'ativo',
                permitir_acompanhantes: true,
                max_acompanhantes: 2
            });
        }
        console.log("✨ Dados seed criados.");
    }

    // Seed de Médicos de Teste (Equipe Univentos)
    const crmsTeste = ['00001', '00002', '00003', '00004'];
    for (let i = 0; i < crmsTeste.length; i++) {
        const crm = crmsTeste[i];
        const index = i + 1;
        const exists = await Participante.findOne({ where: { crm } });
        
        if (!exists) {
            console.log(`👨‍⚕️ Criando Médico Teste ${index}...`);
            await Participante.create({
                nome: `Médico Teste ${index}`,
                cpf: `0000000000${index}`,
                crm: crm,
                especialidade: 'Equipe Univentos',
                genero: index % 2 === 0 ? 'F' : 'M',
                data_nascimento: `${1960 + (index * 10)}-01-01`, // Décadas diferentes
                ativo: true
            });
        }
    }

    // Seed de Usuários
    const usuarioCount = await Usuario.count();
    if (usuarioCount === 0) {
        console.log("👤 Criando usuários iniciais...");
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
        console.log("✅ Usuários Admin e Operador criados.");
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
