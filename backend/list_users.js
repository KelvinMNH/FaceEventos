const { Usuario } = require('./src/models');

async function listUsers() {
    try {
        console.log("Listing Users...");
        const users = await Usuario.findAll({
            attributes: ['id', 'nome', 'username', 'perfil']
        });
        console.log("Users:", JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error listing users:", error);
    } finally {
        process.exit();
    }
}

listUsers();
