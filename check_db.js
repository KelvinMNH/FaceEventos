const { Evento, Participante, sequelize } = require('./backend/models');

async function check() {
    try {
        const eventos = await Evento.findAll();
        console.log("Eventos encontrados:", eventos.length);
        eventos.forEach(e => console.log(e.toJSON()));

        const participantes = await Participante.findAll();
        console.log("Participantes encontrados:", participantes.length);
    } catch (e) {
        console.error("Erro ao verificar:", e);
    } finally {
        await sequelize.close();
    }
}

check();
