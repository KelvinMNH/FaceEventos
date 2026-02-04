const { sequelize, Evento, Participante, RegistroAcesso } = require('./models');

async function resetAndSeed() {
    try {
        await sequelize.sync({ force: true }); // Apaga tudo
        console.log("Banco de dados limpo.");

        await Evento.create({
            nome: 'UniEvento Tech 2026',
            data_inicio: new Date(),
            status: 'ativo',
            permitir_acompanhantes: true,
            max_acompanhantes: 2
        });
        console.log("Evento inicial criado com sucesso.");

    } catch (e) {
        console.error("Erro ao resetar:", e);
    } finally {
        process.exit();
    }
}

resetAndSeed();
