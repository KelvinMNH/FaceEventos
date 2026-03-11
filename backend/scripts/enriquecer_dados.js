/**
 * Script standalone para enriquecer dados de sexo e data de nascimento
 * de todos os cooperados que ainda estão com genero='O' ou data_nascimento=null.
 *
 * Uso: node backend/scripts/enriquecer_dados.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SyncParticipantesService = require('../src/services/SyncParticipantesService');

async function main() {
    console.log('=======================================================');
    console.log(' ENRIQUECIMENTO DE DADOS — SEXO E DATA DE NASCIMENTO   ');
    console.log('=======================================================\n');

    console.log('🔑 Obtendo token...');
    const token = await SyncParticipantesService.obterToken();

    const resultado = await SyncParticipantesService.enriquecerDados(token);

    console.log('\n=======================================================');
    console.log('✅ RESULTADO FINAL:');
    console.log(`   Atualizados    : ${resultado.enriquecidos}`);
    console.log(`   Sem CRM        : ${resultado.semCrm}`);
    console.log(`   Sem retorno API: ${resultado.erros}`);
    console.log('=======================================================');
    process.exit(0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
