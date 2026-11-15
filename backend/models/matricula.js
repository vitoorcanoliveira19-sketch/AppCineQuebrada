const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Matricula", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  participanteId: { type: DataTypes.INTEGER, allowNull: false, field: "participante_id" },
  turmaId: { type: DataTypes.INTEGER, allowNull: false, field: "turma_id" },
  situacao: { type: DataTypes.ENUM("ativa", "encerrada"), allowNull: false, defaultValue: "ativa" },
  matriculadaEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "matriculada_em" },
  encerradaEm: { type: DataTypes.DATE, allowNull: true, field: "encerrada_em" },
}, { indexes: [{ fields: ["participante_id"] }, { fields: ["turma_id"] }, { fields: ["situacao"] }] });
