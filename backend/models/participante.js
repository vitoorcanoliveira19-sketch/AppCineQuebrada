const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Participante = sequelize.define("Participante", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(255), allowNull: false },
  dataNascimento: { type: DataTypes.DATEONLY, allowNull: true, field: "data_nascimento" },
  rg: { type: DataTypes.STRING(30), allowNull: true },
  celular: { type: DataTypes.STRING(30), allowNull: true },
  telefone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: false },
  cep: { type: DataTypes.STRING(9), allowNull: false },
  bairro: { type: DataTypes.STRING(120), allowNull: true },
  logradouro: { type: DataTypes.STRING(255), allowNull: true },
  numero: { type: DataTypes.STRING(20), allowNull: true },
  genero: { type: DataTypes.STRING(40), allowNull: true },
  responsavelNome: { type: DataTypes.STRING(255), allowNull: true, field: "responsavel_nome" },
  responsavelTelefone: { type: DataTypes.STRING(30), allowNull: true, field: "responsavel_telefone" },
  atividadeInteresse: { type: DataTypes.STRING(120), allowNull: true, field: "atividade_interesse" },
  status: { type: DataTypes.ENUM("pendente", "aprovado", "recusado"), allowNull: false, defaultValue: "pendente" },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  analisadoEm: { type: DataTypes.DATE, allowNull: true, field: "analisado_em" },
  analisadoPorId: { type: DataTypes.INTEGER, allowNull: true, field: "analisado_por_id" },
}, {
  indexes: [{ fields: ["email"] }, { fields: ["status"] }],
});

module.exports = Participante;
