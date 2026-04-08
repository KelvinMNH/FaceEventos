
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// 1. Configuração do SQLite (Origem)
const sourceSqlite = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'), // Arquivo que vamos copiar
    logging: false
});

// 2. Configuração do Oracle (Destino)
// Usamos as variáveis de ambiente que já estão no Docker Compose
const destOracle = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'oracle',
    logging: false,
    dialectOptions: {
        connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE_NAME}`
    }
});

// Importar os modelos originais (que já usam o config/database.js padrão)
// Nota: Os modelos por padrão usam o sequelize do config/database. Para o script,
// precisamos que eles usem instâncias específicas. Vamos carregar os dados brutos e inserir.

async function migrar() {
    console.log('🏁 Iniciando Migração SQLite -> Oracle...');

    try {
        await sourceSqlite.authenticate();
        await destOracle.authenticate();
        console.log('✅ Conexão estabelecida.');

        // Debug: Listar tabelas do SQLite
        const [tables] = await sourceSqlite.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📂 Tabelas encontradas no SQLite:', tables.map(t => t.name).join(', '));
        
        if (tables.length === 0) {
            console.error('❌ ERRO: O arquivo SQLite parece estar VAZIO ou não contém tabelas.');
            return;
        }

        // 3. Descobrir nomes reais das tabelas no Oracle
        const rawTables = await destOracle.getQueryInterface().showAllTables();
        const oracleTables = rawTables.map(t => typeof t === 'string' ? t : t.tableName);
        console.log('📂 Tabelas encontradas no Oracle:', oracleTables.join(', '));

        const tabelas = [
            'Evento',
            'Participante',
            'Usuario',
            'Acompanhante',
            'RegistroAcesso',
            'LogAuditoria',
            'HistoricoSincronizacao'
        ];

        for (const modelName of tabelas) {
            console.log(`\n📦 Migrando modelo: ${modelName}...`);
            
            let rows = [];
            let tableNameUsed = '';
            
            // Tenta nomes variados no SQLite
            const variations = [modelName, `${modelName}s`, modelName.toLowerCase(), `${modelName.toLowerCase()}s`, 'log_auditorias'].filter((v, i, a) => a.indexOf(v) === i);
            
            for (const v of variations) {
                try {
                    [rows] = await sourceSqlite.query(`SELECT * FROM "${v}"`);
                    tableNameUsed = v;
                    break;
                } catch (e) { continue; }
            }

            if (!tableNameUsed || rows.length === 0) {
                console.log(`   🔸 Tabela para ${modelName} não encontrada ou vazia no SQLite. Pulando.`);
                continue;
            }

            console.log(`   🔹 Carregados ${rows.length} registros de "${tableNameUsed}".`);

            // --- DESCOBRIR NOME NO ORACLE ---
            // Tenta achar o melhor match no Oracle
            const oracleMatch = oracleTables.find(t => 
                t.toLowerCase() === modelName.toLowerCase() || 
                t.toLowerCase() === `${modelName.toLowerCase()}s` ||
                t.toLowerCase() === modelName.toLowerCase().replace('_', '') + 's'
            );

            if (!oracleMatch) {
                console.log(`   ❌ Tabela correspondente para ${modelName} não encontrada no Oracle. Sincronize o banco primeiro.`);
                continue;
            }

            // --- LIMPEZA ---
            try {
                process.stdout.write(`   🧹 Limpando tabela ${oracleMatch} no Oracle... `);
                await destOracle.getQueryInterface().bulkDelete(oracleMatch, {});
                console.log('OK.');
            } catch (err) {
                console.log('Aviso: Erro ao limpar:', err.message);
            }

            // --- FORMATAÇÃO ---
            const formattedRows = rows.map(row => {
                const newRow = { ...row };
                for (const key in newRow) {
                    const value = newRow[key];
                    if (value && typeof value === 'string' && value.includes('-') && value.length >= 10) {
                        const d = new Date(value);
                        if (!isNaN(d.getTime())) newRow[key] = d;
                    }
                }
                return newRow;
            });

            // --- INSERÇÃO ---
            console.log(`   🔹 Inserindo em "${oracleMatch}" (Lotes de 500)...`);
            const chunkSize = 500;
            for (let i = 0; i < formattedRows.length; i += chunkSize) {
                const chunk = formattedRows.slice(i, i + chunkSize);
                try {
                    await destOracle.getQueryInterface().bulkInsert(oracleMatch, chunk);
                } catch (err) {
                    console.error(`   ❌ Erro no lote ${i/chunkSize + 1}:`, err.message);
                }
            }
            console.log(`   ✅ Sucesso!`);
        }

        console.log('\n✨ Migração Concluída no Oracle com sucesso!');
    } catch (e) {
        console.error('\n💥 Erro crítico na migração:', e);
    } finally {
        await sourceSqlite.close();
        await destOracle.close();
        process.exit(0);
    }
}

migrar();
