require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Participante, RegistroAcesso, Acompanhante } = require('../src/models');
const { Op } = require('sequelize');

async function main() {
    // 1. Buscar IDs dos participantes mock (ativo=false)
    const mocks = await Participante.findAll({
        where: { ativo: false },
        attributes: ['id', 'nome', 'cpf']
    });
    const ids = mocks.map(p => p.id);
    console.log(`Encontrados ${ids.length} participantes inativos (mock).`);

    if (ids.length === 0) {
        console.log('Nada a remover.');
        process.exit(0);
    }

    // 2. Remover registros de acesso vinculados
    const regRemovidos = await RegistroAcesso.destroy({
        where: { ParticipanteId: { [Op.in]: ids } }
    });
    console.log(`  → ${regRemovidos} registros de acesso removidos.`);

    // 3. Remover acompanhantes vinculados
    const acompRemovidos = await Acompanhante.destroy({
        where: { ParticipanteId: { [Op.in]: ids } }
    });
    console.log(`  → ${acompRemovidos} acompanhantes removidos.`);

    // 4. Agora sim remover os participantes mock
    const removidos = await Participante.destroy({
        where: { id: { [Op.in]: ids } }
    });
    console.log(`\n✅ ${removidos} participantes mock removidos do banco.`);
    process.exit(0);
}
main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
