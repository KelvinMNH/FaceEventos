const { sequelize, Participante } = require('./models');

const nomesReais = [
    "Ana Silva", "Bruno Santos", "Carlos Oliveira", "Daniela Souza", "Eduardo Lima",
    "Fernanda Costa", "Gabriel Pereira", "Helena Alves", "Igor Martins", "Julia Rodrigues",
    "Kelvin Higino", "Larissa Ferreira", "Marcos Ribeiro", "Natalia Carvalho", "Otavio Gomes",
    "Paula Barbosa", "Rafael Araujo", "Sandra Castro", "Thiago Moura", "Ursula Mendes",
    "Vinicius Cardoso", "Wagner Rocha", "Xavier Dias", "Yasmin Teixeira", "Zeca Nunes",
    "Adriana Lopes", "Bernardo Ramos", "Camila Duarte", "Diego Freitas", "Elisa Guimaraes",
    "Fabio Navarro", "Giovana Pires", "Hugo Queiroz", "Isabela Santana", "Jorge Vieira",
    "Karina Xavier", "Leonardo Zamboni", "Mariana Antunes", "Nilson Batista", "Olivia Campos",
    "Paulo Dantas", "Quezia Esteves", "Ricardo Fontes", "Sofia Garcia", "Tulio Hernandes",
    "Ubaldo Inacio", "Vanessa Jordao", "William Klein", "Xuxa Meneghel", "Yuri Nogueira"
];

const sobrenomes = ["da Silva", "de Souza", "dos Santos", "Oliveira", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Alves", "Carvalho", "Mendes", "Ribeiro"];

function gerarNomeReal() {
    const prenome = nomesReais[Math.floor(Math.random() * nomesReais.length)].split(' ')[0];
    const sobrenome1 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
    const sobrenome2 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
    return `${prenome} ${sobrenome1} ${sobrenome2}`;
}

async function updateNames() {
    try {
        await sequelize.sync();

        const participantes = await Participante.findAll();

        for (const p of participantes) {
            // Se for um nome genérico de simulação, atualiza
            if (p.nome.startsWith('Participante Simulação')) {
                const novoNome = gerarNomeReal();
                p.nome = novoNome;
                await p.save();
            }
        }

        console.log("Nomes atualizados para nomes reais brasileiros!");
    } catch (e) {
        console.error("Erro ao atualizar nomes:", e);
    } finally {
        process.exit();
    }
}

updateNames();
