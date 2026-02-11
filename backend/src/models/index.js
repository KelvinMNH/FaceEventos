const sequelize = require('../config/database');
const Evento = require('./Evento');
const Participante = require('./Participante');
const Acompanhante = require('./Acompanhante');
const RegistroAcesso = require('./RegistroAcesso');
const Usuario = require('./Usuario');

// Relacionamentos
Evento.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Evento);

Participante.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Participante);

Participante.hasMany(Acompanhante);
Acompanhante.belongsTo(Participante);

Acompanhante.hasMany(RegistroAcesso, { onDelete: 'CASCADE' });
RegistroAcesso.belongsTo(Acompanhante);

async function syncDB() {
    try {
        // Alterado para false para evitar criação de tabelas de backup no SQLite
        // Se precisar alterar schema, use migration ou ative manualmente
        await sequelize.sync({ alter: false });
        console.log("✅ Banco de dados sincronizado.");
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
                nome: 'Operador Padrão',
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
    syncDB
};
