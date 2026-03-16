const { Participante } = require('./src/models');

async function cleanupBiometrics() {
    try {
        const participants = await Participante.findAll({
            where: {
                template_biometrico: { [require('sequelize').Op.ne]: null }
            }
        });

        console.log(`Verificando ${participants.length} biometrias...`);
        let removedCount = 0;

        for (const p of participants) {
            if (p.template_biometrico.startsWith('manual_')) continue;

            const buffer = Buffer.from(p.template_biometrico, 'base64');
            // 320x480 = 153600 bytes
            if (buffer.length !== 153600) {
                console.log(`- Removendo biometria não-padrão de ${p.nome} (${buffer.length} bytes)`);
                p.template_biometrico = null;
                await p.save();
                removedCount++;
            }
        }

        console.log(`Limpeza concluída. ${removedCount} biometrias removidas.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanupBiometrics();
