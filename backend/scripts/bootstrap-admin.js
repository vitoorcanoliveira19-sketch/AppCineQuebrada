const { hashSenha } = require("../services/passwords");
const { connectWithRetry, sequelize } = require("../config/database");
const { Usuario, syncDatabase } = require("../models");

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error("Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres) no ambiente.");
  await connectWithRetry();
  await syncDatabase();
  if (await Usuario.count({ where: { papel: "administrador" } })) throw new Error("Já existe administrador; bootstrap inicial recusado.");
  const usuario = await Usuario.create({ nome: ADMIN_NAME.trim(), email: ADMIN_EMAIL.trim().toLowerCase(), senha: await hashSenha(ADMIN_PASSWORD), papel: "administrador" });
  console.log(`Administrador inicial criado: ${usuario.email}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
