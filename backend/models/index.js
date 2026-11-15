const Usuario = require("./usuario");
const Participante = require("./participante");
const Atividade = require("./atividade");
const Sala = require("./sala");
const Educador = require("./educador");
const Turma = require("./turma");
const { sequelize } = require("../config/database");

Atividade.hasMany(Turma, { foreignKey: { name: "atividadeId", field: "atividade_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Atividade, { as: "atividade", foreignKey: { name: "atividadeId", field: "atividade_id", allowNull: false } });
Educador.hasMany(Turma, { foreignKey: { name: "educadorId", field: "educador_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Educador, { as: "educador", foreignKey: { name: "educadorId", field: "educador_id", allowNull: false } });
Sala.hasMany(Turma, { foreignKey: { name: "salaId", field: "sala_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Sala, { as: "sala", foreignKey: { name: "salaId", field: "sala_id", allowNull: false } });

const syncDatabase = async () => {
  await sequelize.sync();
  // Upgrade the existing table safely; sync() alone does not add model fields.
  const tabela = await sequelize.getQueryInterface().describeTable("Participante");
  const colunas = {
    ativo: { type: require("sequelize").DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    analisado_em: { type: require("sequelize").DataTypes.DATE, allowNull: true },
    analisado_por_id: { type: require("sequelize").DataTypes.INTEGER, allowNull: true },
  };
  for (const [nome, definicao] of Object.entries(colunas)) {
    if (!tabela[nome]) await sequelize.getQueryInterface().addColumn("Participante", nome, definicao);
  }
  console.log("Modelos sincronizados com o banco de dados.");
};

module.exports = {
  sequelize,
  Usuario,
  Participante,
  Atividade,
  Sala,
  Educador,
  Turma,
  syncDatabase,
};
