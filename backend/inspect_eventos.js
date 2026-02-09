const { Evento } = require('./src/models');

async function inspect() {
    try {
        console.log("Inspecting Evento table...");
        const eventos = await Evento.findAll();
        console.log("Total Eventos:", eventos.length);
        if (eventos.length > 0) {
            console.log("Sample Evento:", JSON.stringify(eventos[0], null, 2));
        }

        // Check schema by trying to describe or similar
        // Since we are using Sequelize, we can check the model definition
        console.log("Model attributes:", Object.keys(Evento.rawAttributes));

    } catch (error) {
        console.error("Error inspecting database:", error);
    } finally {
        process.exit();
    }
}

inspect();
