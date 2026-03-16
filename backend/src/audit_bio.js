const { Participante, RegistroAcesso } = require('./models');
const { Op } = require('sequelize');

async function audit() {
    console.log('--- AUDITORIA DE BIOMETRIA ---');
    
    const countTotal = await Participante.count();
    const countWithBio = await Participante.count({
        where: { template_biometrico: { [Op.ne]: null } }
    });
    
    console.log(`Total Participantes: ${countTotal}`);
    console.log(`Com template_biometrico: ${countWithBio}`);

    console.log('\n--- Busca Exhaustiva por "Zulmira" ---');
    const participants = await Participante.findAll({
        where: { nome: { [Op.like]: '%Zulmira%' } }
    });
    
    participants.forEach(p => {
        console.log(`ID: ${p.id} | Nome: ${p.nome} | Template: ${p.template_biometrico ? 'SIM (' + p.template_biometrico.length + ')' : 'NÃO'}`);
    });

    process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
