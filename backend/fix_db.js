const { sequelize } = require('./models');

async function fix() {
    try {
        await sequelize.query("ALTER TABLE Participantes ADD COLUMN categoria TEXT DEFAULT 'Outros';");
        console.log("Coluna adicionada!");
    } catch (e) {
        console.log("Erro (pode já existir):", e.message);
    }
}

fix();
