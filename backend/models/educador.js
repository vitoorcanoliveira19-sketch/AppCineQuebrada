const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Educador", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nome: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true, len: [2, 255] } },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  contato: { type: DataTypes.STRING(60), allowNull: false, validate: { notEmpty: true, len: [3, 60] } },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { indexes: [{ fields: ["ativo"] }] });
