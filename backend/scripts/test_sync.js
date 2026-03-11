/**
 * Script de teste para rodar a sincronização real de participantes.
 * Use: node backend/scripts/test_sync.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SyncParticipantesService = require('../src/services/SyncParticipantesService');

async function main() {
    console.log('======================================================');
    console.log(' TESTE DE SINCRONIZAÇÃO DE PARTICIPANTES (API REAL)   ');
    console.log('======================================================\n');

    const resultado = await SyncParticipantesService.sync();

    console.log('\n======================================================');
    if (resultado.sucesso) {
        console.log('✅ RESULTADO FINAL:');
        console.log(`   Adicionados : ${resultado.adicionados}`);
        console.log(`   Modificados : ${resultado.modificados}`);
        console.log(`   Inativados  : ${resultado.inativados}`);
        console.log(`   Total ativo : ${resultado.total}`);
    } else {
        console.log('❌ FALHOU:', resultado.erro);
    }
    console.log('======================================================');
    process.exit(0);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
