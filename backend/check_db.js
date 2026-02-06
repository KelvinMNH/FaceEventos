const { sequelize } = require('./src/models');

async function check() {
    try {
        console.log("--- SQLITE MASTER ---");
        const [results] = await sequelize.query("SELECT * FROM sqlite_master");
        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
