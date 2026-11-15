const Usuario = require("./usuario");
const Participante = require("./participante");
const Atividade = require("./atividade");
const Sala = require("./sala");
const Educador = require("./educador");
const Turma = require("./turma");
const Matricula = require("./matricula");
const Chamada = require("./chamada");
const Presenca = require("./presenca");
const { sequelize } = require("../config/database");

Atividade.hasMany(Turma, { foreignKey: { name: "atividadeId", field: "atividade_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Atividade, { as: "atividade", foreignKey: { name: "atividadeId", field: "atividade_id", allowNull: false } });
Educador.hasMany(Turma, { foreignKey: { name: "educadorId", field: "educador_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Educador, { as: "educador", foreignKey: { name: "educadorId", field: "educador_id", allowNull: false } });
Sala.hasMany(Turma, { foreignKey: { name: "salaId", field: "sala_id", allowNull: false }, onDelete: "RESTRICT" });
Turma.belongsTo(Sala, { as: "sala", foreignKey: { name: "salaId", field: "sala_id", allowNull: false } });
Participante.hasMany(Matricula, { as: "matriculas", foreignKey: { name: "participanteId", field: "participante_id", allowNull: false }, onDelete: "RESTRICT" });
Matricula.belongsTo(Participante, { as: "participante", foreignKey: { name: "participanteId", field: "participante_id", allowNull: false } });
Turma.hasMany(Matricula, { as: "matriculas", foreignKey: { name: "turmaId", field: "turma_id", allowNull: false }, onDelete: "RESTRICT" });
Matricula.belongsTo(Turma, { as: "turma", foreignKey: { name: "turmaId", field: "turma_id", allowNull: false } });
Turma.hasMany(Chamada, { as: "chamadas", foreignKey: { name: "turmaId", field: "turma_id", allowNull: false }, onDelete: "RESTRICT" });
Chamada.belongsTo(Turma, { as: "turma", foreignKey: { name: "turmaId", field: "turma_id", allowNull: false } });
Chamada.hasMany(Presenca, { as: "presencas", foreignKey: { name: "chamadaId", field: "chamada_id", allowNull: false }, onDelete: "CASCADE" });
Presenca.belongsTo(Chamada, { as: "chamada", foreignKey: { name: "chamadaId", field: "chamada_id", allowNull: false } });
Matricula.hasMany(Presenca, { as: "presencas", foreignKey: { name: "matriculaId", field: "matricula_id", allowNull: false }, onDelete: "RESTRICT" });
Presenca.belongsTo(Matricula, { as: "matricula", foreignKey: { name: "matriculaId", field: "matricula_id", allowNull: false } });

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
  Matricula,
  Chamada,
  Presenca,
  syncDatabase,
};
