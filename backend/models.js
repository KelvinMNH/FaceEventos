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
  status: { type: DataTypes.ENUM('agendado', 'ativo', 'finalizado'), defaultValue: 'ativo' } // Default ativo para simplificar o fluxo
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
  device_id: { type: DataTypes.STRING }
});

// Relacionamentos
Evento.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Evento);

Participante.hasMany(RegistroAcesso);
RegistroAcesso.belongsTo(Participante);

async function syncDB() {
  await sequelize.sync({ force: false }); // force: true recria tabelas (cuidado)
  console.log("Banco de dados sincronizado.");

  // Sear dados iniciais se vazio
  const count = await Participante.count();
  if (count === 0) {
    await Participante.bulkCreate([
      { nome: 'Kelvin Higino', documento: '12345678900', template_biometrico: 'bio_kelvin_123', ativo: true },
      { nome: 'João Silva', documento: '98765432100', template_biometrico: 'bio_joao_456', ativo: true }
    ]);
    await Evento.create({ nome: 'UniEvento Tech 2026', data_inicio: new Date(), status: 'ativo' });
    console.log("Dados seed criados.");
  }
}

module.exports = { sequelize, Evento, Participante, RegistroAcesso, syncDB };
