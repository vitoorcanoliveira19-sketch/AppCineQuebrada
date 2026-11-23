const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
module.exports = sequelize.define("Sessao", {
  id: { type: DataTypes.STRING(64), primaryKey: true },
  usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: "usuario_id" },
  versao: { type: DataTypes.INTEGER, allowNull: false },
  cliente: { type: DataTypes.ENUM("web", "native"), allowNull: false },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: "expira_em" },
  vistaEm: { type: DataTypes.DATE, allowNull: false, field: "vista_em" },
}, { indexes: [{ fields: ["usuario_id"] }, { fields: ["expira_em"] }] });
