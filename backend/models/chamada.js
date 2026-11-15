const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Chamada", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  turmaId: { type: DataTypes.INTEGER, allowNull: false, field: "turma_id" },
  dataAula: { type: DataTypes.DATEONLY, allowNull: false, field: "data_aula" },
}, {
  indexes: [{ unique: true, fields: ["turma_id", "data_aula"], name: "chamada_turma_data_unica" }],
});
