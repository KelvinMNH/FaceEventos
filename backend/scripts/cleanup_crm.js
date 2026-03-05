const { Participante } = require('../src/models');
const { Op } = require('sequelize');

async function cleanCRMs() {
    try {
        console.log('--- Iniciando limpeza de CRMs ---');
        const participantes = await Participante.findAll({
            where: {
                crm: {
                    [Op.ne]: null
                }
            }
        });

        console.log(`Encontrados ${participantes.length} participantes com CRM.`);
        let count = 0;

        for (const p of participantes) {
            const originalCrm = p.crm;
            // Remove tudo que não for número
            const cleanCrm = originalCrm.replace(/\D/g, '');

            if (cleanCrm !== originalCrm) {
                console.log(`Limpando CRM ID ${p.id}: "${originalCrm}" -> "${cleanCrm}"`);
                p.crm = cleanCrm;
                await p.save();
                count++;
            }
        }

        console.log(`--- Limpeza concluída! ${count} registros atualizados. ---`);
        process.exit(0);
    } catch (error) {
        console.error('Erro na limpeza:', error);
        process.exit(1);
    }
}

cleanCRMs();
