const sequelize = require('../config/database');
const Evento = require('./Evento');
const Participante = require('./Participante');
const Acompanhante = require('./Acompanhante');
const RegistroAcesso = require('./RegistroAcesso');

// Relacionamentos
Evento.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Evento);

Participante.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Participante);
RegistroAcesso.belongsTo(Participante, { as: 'Responsavel', foreignKey: 'responsavel_id' });

Participante.hasMany(Acompanhante);
Acompanhante.belongsTo(Participante);

Acompanhante.hasMany(RegistroAcesso, { onDelete: 'CASCADE' });
RegistroAcesso.belongsTo(Acompanhante);

async function syncDB() {
    try {
        await sequelize.sync({ alter: true });
        console.log("✅ Banco de dados sincronizado (com alter).");
    } catch (error) {
        console.warn("⚠️ Falha ao sincronizar com alter: true. Tentando sincronização padrão...", error.message);
        await sequelize.sync();
        console.log("✅ Banco de dados sincronizado (sem alter).");
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
<<<<<<< HEAD
=======
                // documento removido
>>>>>>> 5da5d04e02c4f43de131d0f5b7d9743b458be59b
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
}

module.exports = {
    sequelize,
    Evento,
    Participante,
    Acompanhante,
    RegistroAcesso,
    syncDB
};
