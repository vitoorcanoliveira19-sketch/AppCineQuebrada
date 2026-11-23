const { createHmac } = require("node:crypto");
const { sequelize, LimiteAcesso } = require("../models");
const { Op } = require("sequelize");
const { secret } = require("../config/security");
let cleanupAt = 0;
function limitar(nome, maximo, identificar = req => req.ip, janelaMs = 15 * 60 * 1000) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const window = Math.floor(now / janelaMs);
      const chave = createHmac("sha256", secret()).update(nome + ":" + window + ":" + identificar(req)).digest("hex");
      const expiraEm = new Date((window + 1) * janelaMs);
      // Atomic increment is shared by all workers. Identifiers are HMACs, never emails/IPs.
      const tentativas = await sequelize.transaction(async transaction => {
        await sequelize.query("INSERT INTO LimiteAcesso (chave, tentativas, expira_em) VALUES (:chave, 1, :expiraEm) ON DUPLICATE KEY UPDATE tentativas = tentativas + 1", {
          replacements: { chave, expiraEm }, transaction,
        });
        const registro = await LimiteAcesso.findByPk(chave, { transaction, lock: transaction.LOCK.UPDATE });
        return registro.tentativas;
      });
      if (now > cleanupAt) {
        cleanupAt = now + 60 * 60 * 1000;
        await LimiteAcesso.destroy({ where: { expiraEm: { [Op.lt]: new Date(now) } } });
        await require("../services/sessions").limparExpiradas();
      }
      if (tentativas > maximo) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((expiraEm.getTime() - now) / 1000))));
        return res.status(429).json({ sucesso: false, mensagem: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
      }
      return next();
    } catch (error) { return next(error); }
  };
}
const loginIp = limitar("login-ip", 100);
const loginConta = limitar("login-conta", 10, req => String(req.body?.email || "").trim().toLowerCase());
const senha = limitar("senha", 10, req => String(req.usuario.sub));
const inscricao = limitar("inscricao", 5);
module.exports = { limitar, loginIp, loginConta, senha, inscricao };
