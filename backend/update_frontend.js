const fs = require('fs');
const path = 'c:/Users/kelvin.higino/Documents/UniEventos/frontend/src/pages/ControleAcesso.jsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Identificadores
    const progressBarStart = '{/* Barra de Participantes vs Acompanhantes */}';
    const progressBarEnd = '})()}';

    // Encontrar o bloco da barra de progresso (atualmente no Card 2 - Participantes Presentes)
    const startIndex = content.indexOf(progressBarStart);
    if (startIndex === -1) {
        console.error('Bloco da barra de progresso não encontrado.');
        process.exit(1);
    }

    const endIndex = content.indexOf(progressBarEnd, startIndex);
    if (endIndex === -1) {
        console.error('Fim do bloco da barra de progresso não encontrado.');
        process.exit(1);
    }

    const fullProgressBarBlock = content.substring(startIndex, endIndex + progressBarEnd.length);

    // Remover o bloco da posição original
    content = content.replace(fullProgressBarBlock, '');

    // Limpar espaços extras que podem ter sobrado (opcional, mas bom)
    // content = content.replace(/<div className="stat-value">\{stats\.totalParticipantesUnicos \|\| 0\}<\/div>\s+<\/div>/, '<div className="stat-value">{stats.totalParticipantesUnicos || 0}</div>\n            </div>');


    // Encontrar o Card 1 (Total de Entradas) para inserir
    // Lá tem um placeholder e um bloco desabilitado que deixamos
    const placeholder = '<div style={{ fontSize: \'0.8rem\', color: \'var(--text-secondary)\' }}>Participantes + Acompanhantes</div>';

    // Remover o placeholder
    content = content.replace(placeholder, '');

    // Remover o bloco desabilitado antigo se existir
    const disabledStart = '{false && logs.length > 0 && (() => {';
    const disabledIdx = content.indexOf(disabledStart);
    if (disabledIdx !== -1) {
        const disabledEnd = content.indexOf(progressBarEnd, disabledIdx);
        if (disabledEnd !== -1) {
            const disabledBlock = content.substring(disabledIdx, disabledEnd + progressBarEnd.length);
            content = content.replace(disabledBlock, '');
        }
    }

    // Inserir o bloco da barra de progresso no Card 1
    // Vamos procurar onde inserir. Logo após o stat-value do Total de Entradas.
    // O stat-value é: <div className="stat-value">{(stats.totalParticipantesUnicos || 0) + (stats.totalAcompanhantes || 0)}</div>

    const insertionPoint = '<div className="stat-value">{(stats.totalParticipantesUnicos || 0) + (stats.totalAcompanhantes || 0)}</div>';

    if (content.indexOf(insertionPoint) === -1) {
        console.error('Ponto de inserção no Card 1 não encontrado.');
        process.exit(1);
    }

    content = content.replace(insertionPoint, insertionPoint + '\n\n' + fullProgressBarBlock);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Arquivo atualizado com sucesso!');

} catch (e) {
    console.error('Erro:', e);
}
