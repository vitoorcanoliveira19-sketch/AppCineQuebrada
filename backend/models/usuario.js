const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Usuario = sequelize.define("Usuario", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true,
    },
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  papel: {
    // Contas existentes antes dos papéis não recebem privilégios automaticamente.
    type: DataTypes.ENUM("administrador", "educador", "bloqueado"),
    allowNull: false,
    defaultValue: "bloqueado",
  },
  educadorId: { type: DataTypes.INTEGER, allowNull: true, unique: true, field: "educador_id" },
  authVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "auth_version" },
});

module.exports = Usuario;
