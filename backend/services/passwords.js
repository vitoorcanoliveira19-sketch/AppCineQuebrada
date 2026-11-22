const bcrypt = require("bcrypt");
const senhaValida = value => typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
const hashSenha = async value => {
  if (!senhaValida(value)) {
    const error = new Error("Use uma senha de pelo menos 12 caracteres e no máximo 72 bytes.");
    error.status = 400;
    throw error;
  }
  return bcrypt.hash(value, 12);
};
module.exports = { senhaValida, hashSenha };
