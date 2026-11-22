const { Op } = require("sequelize");
const { Educador } = require("../models");
async function escopoEducador(req, extra = {}) {
  if (req.usuario.papel === "administrador") return extra;
  const educador = req.usuario.educadorId && await Educador.findOne({
    where: { id: req.usuario.educadorId, ativo: true }, attributes: ["id"],
  });
  if (!educador) {
    const error = new Error("Sua conta não está vinculada a um educador ativo. Solicite a revisão à administração.");
    error.status = 403;
    throw error;
  }
  return { [Op.and]: [{ educadorId: educador.id }, extra] };
}
module.exports = { escopoEducador };
