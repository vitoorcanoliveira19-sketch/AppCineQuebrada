const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
module.exports = sequelize.define("LimiteAcesso", {
  chave: { type: DataTypes.STRING(64), primaryKey: true },
  tentativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: "expira_em" },
}, { timestamps: false, indexes: [{ fields: ["expira_em"] }] });
