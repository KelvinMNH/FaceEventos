const { sequelize } = require('./src/models');

async function inspect() {
    try {
        console.log("\n🔍 INSPECIONANDO BANCO DE DADOS (SQLite)...\n");

        // Listar tabelas
        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");

        if (tables.length === 0) {
            console.log("Nenhuma tabela encontrada.");
            return;
        }

        for (const t of tables) {
            const tableName = t.name;

            // Contar registros
            const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            const count = countResult[0].count;

            console.log(`📋 TABELA: ${tableName} | Total de Registros: ${count}`);
            console.log("=".repeat(50));

            // Listar colunas
            const [columns] = await sequelize.query(`PRAGMA table_info(\`${tableName}\`)`);
            console.log("   [Estrutura]");
            columns.forEach(col => {
                let flags = [];
                if (col.pk) flags.push("PK");
                if (col.notnull) flags.push("Not Null");
                const flagStr = flags.length ? `[${flags.join(", ")}]` : "";
                console.log(`    - ${col.name.padEnd(20)} ${col.type.padEnd(15)} ${flagStr}`);
            });

            // Mostrar até 3 exemplos
            if (count > 0) {
                const [rows] = await sequelize.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
                console.log("\n   [Exemplos de Dados]");
                rows.forEach(row => {
                    // Simplificar exibição removendo nulls para caber melhor
                    const cleanRow = Object.entries(row).reduce((acc, [k, v]) => {
                        if (v !== null) acc[k] = v;
                        return acc;
                    }, {});
                    console.log(`    ${JSON.stringify(cleanRow)}`);
                });
            }
            console.log("\n" + "-".repeat(50) + "\n");
        }

    } catch (e) {
        console.error("❌ Erro ao inspecionar:", e);
    }
}

inspect();
