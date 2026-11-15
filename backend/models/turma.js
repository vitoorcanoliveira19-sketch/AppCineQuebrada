const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Turma", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true, len: [2, 120] } },
  atividadeId: { type: DataTypes.INTEGER, allowNull: false, field: "atividade_id" },
  educadorId: { type: DataTypes.INTEGER, allowNull: false, field: "educador_id" },
  salaId: { type: DataTypes.INTEGER, allowNull: false, field: "sala_id" },
  ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { indexes: [{ fields: ["atividade_id"] }, { fields: ["educador_id"] }, { fields: ["sala_id"] }, { fields: ["ativa"] }] });
