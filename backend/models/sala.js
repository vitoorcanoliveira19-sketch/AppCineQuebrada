const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Sala", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(120), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 120] } },
  ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { indexes: [{ fields: ["ativa"] }] });
