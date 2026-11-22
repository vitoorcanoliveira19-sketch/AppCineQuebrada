const { sequelize, Usuario, Educador } = require("../models");
const { revogarTodas } = require("../services/sessions");
async function main() {
  const id = Number(process.env.EDUCADOR_ID);
  const email = String(process.env.USER_EMAIL || "").trim().toLowerCase();
  if (!email || !Number.isSafeInteger(id) || id < 1) throw new Error("Defina USER_EMAIL e EDUCADOR_ID válidos.");
  await sequelize.transaction(async transaction => {
    const usuario = await Usuario.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
    const educador = await Educador.findByPk(id, { transaction });
    if (!usuario || usuario.papel === "administrador" || !educador?.ativo) throw new Error("Conta ou educador ativo não encontrado.");
    await usuario.update({ educadorId: id, authVersion: usuario.authVersion + 1 }, { transaction });
    await revogarTodas(usuario.id, transaction);
  });
  console.log("Vínculo atualizado; sessões anteriores revogadas.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
