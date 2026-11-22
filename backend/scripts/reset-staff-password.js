const { sequelize, Usuario } = require("../models");
const { hashSenha } = require("../services/passwords");
const { revogarTodas } = require("../services/sessions");
async function main() {
  const email = String(process.env.RESET_EMAIL || "").trim().toLowerCase();
  if (!email) throw new Error("Defina RESET_EMAIL e RESET_PASSWORD no ambiente local.");
  const senha = await hashSenha(process.env.RESET_PASSWORD);
  await sequelize.transaction(async transaction => {
    const usuario = await Usuario.findOne({ where: { email, ...(process.env.RESET_EDUCATOR_ONLY ? { papel: "educador" } : {}) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!usuario) throw new Error("Conta não encontrada.");
    await usuario.update({ senha, authVersion: usuario.authVersion + 1 }, { transaction });
    await revogarTodas(usuario.id, transaction);
  });
  console.log("Senha redefinida; sessões anteriores revogadas. O segundo fator foi preservado.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
