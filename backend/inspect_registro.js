const { sequelize } = require('./src/models');
async function run() {
    try {
        // Tenta achar o nome da tabela certo
        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Registro%';");
        console.log("Tabelas encontradas:", tables);

        for (const t of tables) {
            console.log(`\nColunas de ${t.name}:`);
            const [cols] = await sequelize.query(`PRAGMA table_info(\`${t.name}\`)`);
            cols.forEach(c => console.log(` - ${c.name}`));
        }
    } catch (e) { console.error(e); }
}
run();
