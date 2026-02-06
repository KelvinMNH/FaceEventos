const { sequelize, Evento, Participante, Acompanhante, RegistroAcesso, syncDB } = require('./src/models');
const ParticipanteController = require('./src/controllers/ParticipanteController');
const AcessoController = require('./src/controllers/AcessoController');

async function runTest() {
    try {
        console.log("🔄 Sincronizando Banco de Dados...");
        await syncDB();

        console.log("🔍 Verificando Schema de RegistroAcesso...");
        const tableInfo = await sequelize.getQueryInterface().describeTable('RegistroAcessos');
        if (tableInfo.responsavel_id) {
            console.error("❌ FALHA: responsavel_id ainda existe na tabela RegistroAcessos!");
            process.exit(1);
        } else {
            console.log("✅ SUCESSO: responsavel_id removido da tabela RegistroAcessos.");
        }

        console.log("👤 Preparando dados de teste...");
        // Ensure event exists
        let evento = await Evento.findOne({ where: { status: 'ativo' } });
        if (!evento) {
            evento = await Evento.create({
                nome: 'Evento Teste',
                data_inicio: new Date(),
                status: 'ativo',
                permitir_acompanhantes: true,
                max_acompanhantes: 5
            });
        }

        // Ensure participant exists
        let participante = await Participante.findOne();
        if (!participante) {
            participante = await Participante.create({
                nome: 'Tester',
                cpf: '000.000.000-00',
                ativo: true,
                template_biometrico: 'test_bio'
            });
        }

        console.log(`🧪 Testando Registro de Acompanhante para Participante ID: ${participante.id}`);
        const mockReq = {
            body: {
                nome: "Acompanhante Teste " + Date.now(),
                responsavel_id: participante.id
            }
        };
        const mockRes = {
            status: function (code) {
                console.log(`   Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log("   Response:", data);
                if (data.success === false) {
                    console.error("❌ Falha no registro de acompanhante:", data);
                } else {
                    console.log("✅ Acompanhante registrado com sucesso.");
                }
            }
        };

        await ParticipanteController.registrarAcompanhante(mockReq, mockRes);

        console.log("📜 Testando Recuperação de Logs...");
        const mockResLogs = {
            status: function (code) { return this; },
            json: function (data) {
                if (data.length > 0 && !data[0].Responsavel && !data[0].responsavel_id) {
                    console.log(`✅ Logs recuperados (${data.length} registros). Campo Responsavel ausente como esperado.`);
                } else if (data.length > 0 && (data[0].Responsavel || data[0].responsavel_id)) {
                    console.error("❌ FALHA: Logs ainda retornam campo Responsavel/responsavel_id!");
                    console.log("Exemplo:", JSON.stringify(data[0], null, 2));
                } else {
                    console.log("⚠️ Nenhum log encontrado ou verificação inconclusiva.");
                }
            }
        };
        await AcessoController.getLogs({}, mockResLogs);

        console.log("✅ Verificação Concluída.");

    } catch (e) {
        console.error("❌ Erro fatal no teste:", e);
        process.exit(1);
    } finally {
        // await sequelize.close(); // Keep open in case user wants to run app
    }
}

runTest();
