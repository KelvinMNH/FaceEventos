const { Participante } = require('../src/models');
const { Op } = require('sequelize');

async function addCRMs() {
    try {
        console.log('--- Iniciando adição de CRMs ---');
        const participantes = await Participante.findAll({
            where: {
                [Op.or]: [
                    { crm: null },
                    { crm: '' }
                ]
            }
        });

        console.log(`Encontrados ${participantes.length} participantes sem CRM.`);
        let count = 0;
        let nextCrm = 30000;

        for (const p of participantes) {
            // Garantir que o CRM seja único
            let isUnique = false;
            while (!isUnique) {
                const existing = await Participante.findOne({ where: { crm: String(nextCrm) } });
                if (!existing) {
                    isUnique = true;
                } else {
                    nextCrm++;
                }
            }

            p.crm = String(nextCrm);
            console.log(`Adicionando CRM ao participante ID ${p.id} (${p.nome}): "${p.crm}"`);
            await p.save();
            nextCrm++;
            count++;
        }

        console.log(`--- Adição concluída! ${count} registros atualizados. ---`);
        process.exit(0);
    } catch (error) {
        console.error('Erro na adição de CRMs:', error);
        process.exit(1);
    }
}

addCRMs();
