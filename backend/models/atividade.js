const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Atividade", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(120), allowNull: false, unique: true, validate: { notEmpty: true, len: [2, 120] } },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { indexes: [{ fields: ["ativa"] }] });
