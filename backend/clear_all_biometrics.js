const { Participante } = require('./src/models');

async function clearAllBiometrics() {
    try {
        console.log('--- LIMPANDO TODAS AS BIOMETRIAS DO BANCO ---');
        
        const [updatedCount] = await Participante.update(
            { 
                template_biometrico: null,
                data_biometria: null
            },
            {
                where: {
                    template_biometrico: { [require('sequelize').Op.ne]: null }
                }
            }
        );

        console.log(`Sucesso! ${updatedCount} biometrias foram removidas.`);
        process.exit(0);
    } catch (e) {
        console.error('Erro ao limpar biometrias:', e);
        process.exit(1);
    }
}

clearAllBiometrics();
