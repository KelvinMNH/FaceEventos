const { sequelize } = require('./backend/src/models');

async function debug() {
    try {
        const [rows] = await sequelize.query("SELECT id, nome, uuid FROM Eventos");
        console.log("--- RAW DB ROWS ---");
        rows.forEach(r => {
            console.log(`ID: ${r.id} | NOME: ${r.nome} | UUID: [${r.uuid}] | LEN: ${r.uuid ? r.uuid.length : 0}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
