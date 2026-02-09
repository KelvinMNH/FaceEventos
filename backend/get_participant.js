const { Participante } = require('./src/models');

async function listOne() {
    try {
        console.log("Fetching one participant...");
        const p = await Participante.findOne();
        if (p) {
            console.log("Participant Found:");
            console.log("ID:", p.id);
            console.log("Nome:", p.nome);
            console.log("CPF:", p.cpf);
        } else {
            console.log("No participants found in DB.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

listOne();
