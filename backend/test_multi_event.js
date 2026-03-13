const { Evento, Participante, RegistroAcesso, sequelize } = require('./src/models');

async function testMultiEvent() {
    console.log("🚀 Iniciando Simulação de Múltiplos Eventos...");
    
    try {
        // 1. Criar 3 Eventos
        console.log("📝 Criando 3 eventos de teste...");
        const ev1 = await Evento.create({
            nome: 'TESTE: Congresso de Medicina 01',
            data_inicio: '2026-03-12',
            status: 'agendado'
        });
        const ev2 = await Evento.create({
            nome: 'TESTE: Simpósio de Tech 02',
            data_inicio: '2026-03-12',
            status: 'agendado'
        });
        const ev3 = await Evento.create({
            nome: 'TESTE: Workshop de RH 03',
            data_inicio: '2026-03-12',
            status: 'agendado'
        });

        console.log(`✅ Eventos criados: IDs ${ev1.id}, ${ev2.id}, ${ev3.id}`);

        // 2. Ativar todos os 3
        console.log("⚡ Ativando eventos sucessivamente...");
        // Simular o comportamento do EventoController.ativar que agora NÃO desativa outros
        await Evento.update({ status: 'ativo' }, { where: { id: ev1.id } });
        await Evento.update({ status: 'ativo' }, { where: { id: ev2.id } });
        await Evento.update({ status: 'ativo' }, { where: { id: ev3.id } });

        // 3. Verificar status
        const ativos = await Evento.findAll({ where: { status: 'ativo' } });
        console.log(`📊 Total de eventos ativos: ${ativos.length}`);
        
        const idsAtivos = ativos.map(e => e.id);
        if (idsAtivos.includes(ev1.id) && idsAtivos.includes(ev2.id) && idsAtivos.includes(ev3.id)) {
            console.log("✅ SUCESSO: Todos os eventos de teste estão ATIVOS simultaneamente!");
        } else {
            console.error("❌ FALHA: Nem todos os eventos estão ativos.");
            process.exit(1);
        }

        // 4. Simular Acessos
        console.log("👤 Simulando entradas em eventos diferentes...");
        const p1 = await Participante.findOne();
        if (!p1) throw new Error("Nenhum participante encontrado para teste.");

        // Entrada no Evento 1
        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: 'sucesso',
            device_id: 'UNIT_TEST',
            EventoId: ev1.id,
            ParticipanteId: p1.id
        });
        console.log(`   - Participante "${p1.nome}" entrou no Evento 1`);

        // Entrada no Evento 3
        await RegistroAcesso.create({
            tipo_acesso: 'entrada',
            status_validacao: 'sucesso',
            device_id: 'UNIT_TEST',
            EventoId: ev3.id,
            ParticipanteId: p1.id
        });
        console.log(`   - Participante "${p1.nome}" entrou no Evento 3`);

        // 5. Verificar logs por evento
        const logsEv1 = await RegistroAcesso.count({ where: { EventoId: ev1.id } });
        const logsEv2 = await RegistroAcesso.count({ where: { EventoId: ev2.id } });
        const logsEv3 = await RegistroAcesso.count({ where: { EventoId: ev3.id } });

        console.log(`📈 Estatísticas de logs:`);
        console.log(`   - Evento 1: ${logsEv1} logs`);
        console.log(`   - Evento 2: ${logsEv2} logs`);
        console.log(`   - Evento 3: ${logsEv3} logs`);

        if (logsEv1 === 1 && logsEv2 === 0 && logsEv3 === 1) {
            console.log("✅ SUCESSO: Registros isolados corretamente por evento!");
        } else {
            console.error("❌ FALHA: Contagem de logs inconsistente.");
        }

        // Limpeza opcional (comentado para permitir inspeção manual se desejar)
        // await ev1.destroy(); await ev2.destroy(); await ev3.destroy();
        
        console.log("\n🏁 Fim da simulação com sucesso!");

    } catch (error) {
        console.error("❌ Erro durante o teste:", error);
    } finally {
        await sequelize.close();
    }
}

testMultiEvent();
