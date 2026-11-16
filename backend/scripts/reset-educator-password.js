const bcrypt = require("bcrypt");
const { sequelize, Usuario } = require("../models");

async function main() {
  const email = String(process.env.RESET_EMAIL || "").trim().toLowerCase();
  const password = process.env.RESET_PASSWORD || "";

  if (!email || password.length < 12 || password.length > 200) {
    throw new Error("Defina RESET_EMAIL e RESET_PASSWORD (senha entre 12 e 200 caracteres).");
  }

  const usuario = await Usuario.findOne({ where: { email, papel: "educador" } });
  if (!usuario) throw new Error("Conta de educador não encontrada para esse email.");

  usuario.senha = await bcrypt.hash(password, 12);
  await usuario.save();
  console.log(`Senha redefinida para a conta de educador ${usuario.email}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
