const { Participante, RegistroAcesso } = require('../src/models');
const { Op, Sequelize } = require('sequelize');

async function healthCheck() {
    console.log('🔍 RELATÓRIO DE SAÚDE DA BIOMETRIA (ORACLE)\n');

    try {
        // 1. Contagem Geral
        const total = await Participante.count();
        const ativos = await Participante.count({ where: { ativo: true } });
        const comBio = await Participante.count({ where: { template_biometrico: { [Op.ne]: null } } });
        const inativosComBio = await Participante.count({ 
            where: { template_biometrico: { [Op.ne]: null }, ativo: false } 
        });

        console.log(`📊 Participantes Totais: ${total}`);
        console.log(`✅ Participantes Ativos: ${ativos}`);
        console.log(`👤 Participantes com Biometria: ${comBio}`);
        console.log(`⚠️  Participantes Inativos com Biometria: ${inativosComBio}`);

        // 2. Integridade dos Templates
        if (comBio > 0) {
            const amostras = await Participante.findAll({
                where: { template_biometrico: { [Op.ne]: null } },
                limit: 5,
                attributes: ['id', 'nome', 'template_biometrico']
            });

            console.log('\n🛡️  Integridade dos Templates (Amostra):');
            amostras.forEach(s => {
                const len = s.template_biometrico.length;
                const isJson = s.template_biometrico.startsWith('[');
                const hasDashes = s.template_biometrico.includes('-');
                
                console.log(`   - ${s.nome} (ID: ${s.id}):`);
                console.log(`     Tamanho: ${len} caracteres`);
                console.log(`     Formato JSON Válido? ${isJson ? 'Sim' : 'Não'}`);
                console.log(`     Contém hífens (negativos)? ${hasDashes ? 'Sim' : 'Não'}`);
            });
        } else {
            console.log('\n❌ Nenhuma biometria ativa encontrada para análise de integridade.');
        }

        // 3. Últimos Acessos com Biometria (Reconhecimento Facial)
        const acessosBio = await RegistroAcesso.count({
            where: {
                device_id: { [Op.notIn]: ['manual_entry_web', 'sim_btn_web', 'checkout_totem'] },
                status_validacao: 'sucesso'
            }
        });
        console.log(`\n📡 Total de acessos via Reconhecimento/Biometria: ${acessosBio}`);

    } catch (error) {
        console.error('\n💥 Erro ao realizar diagnóstico:', error.message);
    } finally {
        process.exit();
    }
}

healthCheck();
