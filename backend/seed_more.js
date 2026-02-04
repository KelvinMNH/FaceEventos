const { sequelize, Participante } = require('./models');

async function seedParticipants() {
    try {
        // await sequelize.sync({ alter: true });

        // Limpar simulações antigas para garantir dados novos com demografia
        await Participante.destroy({ where: { nome: { [require('sequelize').Op.like]: 'Participante Simulação%' } } });

        const novosParticipantes = [];
        const generos = ['M', 'F'];

        for (let i = 1; i <= 100; i++) {
            const genero = generos[Math.floor(Math.random() * generos.length)];
            const idade = Math.floor(Math.random() * 40) + 18; // 18 a 58 anos
            const anoNasc = new Date().getFullYear() - idade;
            const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

            const categoria = Math.random() > 0.7 ? 'Medico' : 'Outros'; // 30% medicos

            novosParticipantes.push({
                nome: `Participante Simulação ${i}`,
                documento: categoria === 'Medico' ? `CRM${10000 + i}` : `DOC${10000 + i}`,
                template_biometrico: `bio_sim_${i}`,
                genero: genero,
                data_nascimento: `${anoNasc}-${mes}-${dia}`,
                categoria: categoria,
                ativo: true
            });
        }

        await Participante.bulkCreate(novosParticipantes);
        console.log("100 participantes fictícios criados com sucesso!");
    } catch (e) {
        console.error("Erro ao criar participantes:", e);
    } finally {
        // Fechar conexão se script standalone, mas sequelize geralmente mantém pool. 
        // Não é estritamente necessário fechar para um script one-off que o node mata.
        process.exit();
    }
}

seedParticipants();
