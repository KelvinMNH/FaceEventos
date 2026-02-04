const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Usando SQLite para prototipagem rápida. 
// Para produção, alterar para: new Sequelize('postgres://user:pass@host:5432/dbname')
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

const Evento = sequelize.define('Evento', {
  nome: { type: DataTypes.STRING, allowNull: false },
  data_inicio: { type: DataTypes.DATEONLY, allowNull: false }, // Alterado para DATEONLY para pegar só data (será combinado com hora ou mantido simples)
  hora_inicio: { type: DataTypes.STRING }, // Novo campo para hora
  local: { type: DataTypes.STRING }, // Novo campo para endereço
  imagem: { type: DataTypes.TEXT }, // Base64 da imagem
  status: { type: DataTypes.ENUM('agendado', 'ativo', 'finalizado'), defaultValue: 'ativo' }, // Default ativo para simplificar o fluxo
  permitir_acompanhantes: { type: DataTypes.BOOLEAN, defaultValue: false },
  max_acompanhantes: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Participante = sequelize.define('Participante', {
  nome: { type: DataTypes.STRING, allowNull: false },
  documento: { type: DataTypes.STRING, unique: true },
  template_biometrico: { type: DataTypes.TEXT }, // Base64 ou Hash simulado
  genero: { type: DataTypes.ENUM('M', 'F', 'Outro'), defaultValue: 'Outro' },
  data_nascimento: { type: DataTypes.DATEONLY },
  categoria: { type: DataTypes.ENUM('Medico', 'Outros'), defaultValue: 'Outros' },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const RegistroAcesso = sequelize.define('RegistroAcesso', {
  tipo_acesso: { type: DataTypes.ENUM('entrada', 'saida'), allowNull: false },
  status_validacao: { type: DataTypes.ENUM('sucesso', 'falha', 'nao_encontrado'), allowNull: false },
  device_id: { type: DataTypes.STRING },
  responsavel_id: { type: DataTypes.INTEGER, allowNull: true } // ID do participante responsável, se for acompanhante
});

// Relacionamentos
Evento.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Evento);

Participante.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Participante);
RegistroAcesso.belongsTo(Participante, { as: 'Responsavel', foreignKey: 'responsavel_id' });

async function syncDB() {
  await sequelize.sync({ alter: true }); // altera tabelas existentes sem apagar dados
  console.log("Banco de dados sincronizado.");

  // Sear dados iniciais se vazio
  const count = await Participante.count();
  if (count === 0) {
    const nomes = [
      'Kelvin Higino', 'João Silva', 'Maria Oliveira', 'Ana Santos', 'Pedro Costa',
      'Lucas Pereira', 'Juliana Lima', 'Fernanda Souza', 'Rafaela Alves', 'Gustavo Ribeiro',
      'Camila Rocha', 'Bruno Dias', 'Beatriz Martins', 'Guilherme Gomes', 'Larissa Ferreira',
      'Rodrigo Barbosa', 'Patrícia Lopes', 'Marcos Castro', 'Vanessa Moura', 'Thiago Mendes'
    ];

    const participants = nomes.map((nome, i) => {
      const isMedico = i % 3 === 0;
      const genero = i % 2 === 0 ? 'M' : 'F';
      // Gerar data nascimento aleatória (entre 20 e 60 anos atrás)
      const age = 20 + Math.floor(Math.random() * 40);
      const year = new Date().getFullYear() - age;
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

      // Documento fictício
      let documento;
      if (isMedico) {
        documento = `CRM/AL ${10000 + i}`;
      } else {
        const cpf = `${100 + i}.456.789-${String(i).padStart(2, '0')}`;
        documento = cpf;
      }

      return {
        nome,
        documento,
        template_biometrico: `bio_${i}`,
        genero,
        data_nascimento: `${year}-${month}-${day}`,
        categoria: isMedico ? 'Medico' : 'Outros',
        ativo: true
      };
    });

    await Participante.bulkCreate(participants);

    // Criar evento inicial se não existir
    const eventoCount = await Evento.count();
    if (eventoCount === 0) {
      await Evento.create({
        nome: 'UniEvento Tech 2026',
        data_inicio: new Date(),
        status: 'ativo',
        permitir_acompanhantes: true,
        max_acompanhantes: 2
      });
    }
    console.log("Dados seed aprimorados criados.");
  }
}

module.exports = { sequelize, Evento, Participante, RegistroAcesso, syncDB };
