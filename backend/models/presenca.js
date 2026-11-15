const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

module.exports = sequelize.define("Presenca", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  chamadaId: { type: DataTypes.INTEGER, allowNull: false, field: "chamada_id" },
  matriculaId: { type: DataTypes.INTEGER, allowNull: false, field: "matricula_id" },
  situacao: { type: DataTypes.ENUM("presente", "ausente"), allowNull: false },
}, {
  indexes: [{ unique: true, fields: ["chamada_id", "matricula_id"], name: "presenca_chamada_matricula_unica" }],
});
