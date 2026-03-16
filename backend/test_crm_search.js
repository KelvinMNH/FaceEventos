const { Participante } = require('./src/models');
const { Op } = require('sequelize');

async function testCrmSearch() {
    try {
        // Criar um participante de teste se não existir
        const [p, created] = await Participante.findOrCreate({
            where: { cpf: '99999999999' },
            defaults: {
                nome: 'Test CRM User',
                crm: 'CRM12345',
                ativo: true
            }
        });

        console.log(`Participante de teste: ${p.nome}, CRM: ${p.crm}`);

        const query = '12345';
        const results = await Participante.findAll({
            where: {
                [Op.or]: [
                    { nome: { [Op.like]: `%${query}%` } },
                    { cpf: { [Op.like]: `%${query}%` } },
                    { crm: { [Op.like]: `%${query}%` } }
                ]
            }
        });

        console.log(`Busca por "${query}" retornou ${results.length} resultados.`);
        results.forEach(r => console.log(`- ${r.nome} (CRM: ${r.crm})`));

        if (created) await p.destroy();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testCrmSearch();
