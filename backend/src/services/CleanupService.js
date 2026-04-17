const { RegistroAcesso, Participante } = require('../models');
const { Op } = require('sequelize');

class CleanupService {
    static init() {
        console.log('🧹 CleanupService inicializado. Monitorando registros de teste...');
        // Executa a cada 1 minuto
        setInterval(() => this.executarLimpeza(), 60000);
        
        // Executa uma vez na subida do servidor
        this.executarLimpeza();
    }

    static async executarLimpeza() {
        try {
            const dezMinutosAtras = new Date(Date.now() - 10 * 60 * 1000);
            const crmsTeste = ['00001', '00002', '00003', '00004'];

            // Busca os IDs dos participantes de teste
            const participantesTeste = await Participante.findAll({
                where: { crm: { [Op.in]: crmsTeste } },
                attributes: ['id'],
                raw: true
            });

            if (participantesTeste.length === 0) return;

            const idsTeste = participantesTeste.map(p => p.id);

            // Deleta registros de acesso desses participantes que foram criados há mais de 10 minutos
            const deleted = await RegistroAcesso.destroy({
                where: {
                    ParticipanteId: { [Op.in]: idsTeste },
                    createdAt: { [Op.lt]: dezMinutosAtras }
                }
            });

            if (deleted > 0) {
                console.log(`♻️ Cleanup: ${deleted} registro(s) de teste removido(s) do banco de dados.`);
            }
        } catch (error) {
            console.error('❌ Erro no CleanupService:', error);
        }
    }
}

module.exports = CleanupService;
