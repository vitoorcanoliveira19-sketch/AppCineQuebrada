const { Sessao, Usuario } = require("../models");
const { hash, csrf, equal, cookieToken, IDLE_MS } = require("../services/sessions");
const { originAllowed, mfaRequired } = require("../config/security");
function autenticarSessao({ permitirMfaPendente = false } = {}) {
  return async (req, res, next) => {
    const bearer = req.headers.authorization?.match(/^Bearer\s+([A-Za-z0-9_-]{43})$/i)?.[1];
    const cookie = cookieToken(req);
    const token = cookie || bearer;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return res.status(401).json({ sucesso: false, mensagem: "Autenticação necessária." });
    try {
      const sessao = await Sessao.findByPk(hash(token));
      const now = Date.now();
      if (!sessao || sessao.expiraEm.getTime() <= now || sessao.vistaEm.getTime() + IDLE_MS <= now) return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
      if ((cookie && sessao.cliente !== "web") || (!cookie && sessao.cliente !== "native") || (!cookie && req.headers.origin)) return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida." });
      const usuario = await Usuario.findByPk(sessao.usuarioId);
      if (!usuario || usuario.papel === "bloqueado" || usuario.authVersion !== sessao.versao) return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
      if (cookie && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        if ((req.headers.origin && !originAllowed(req.headers.origin)) || !equal(req.headers["x-csrf-token"], csrf(token))) return res.status(403).json({ sucesso: false, mensagem: "Recarregue a página para validar esta ação.", codigo: "CSRF_INVALIDO" });
      }
      req.usuario = { sub: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, educadorId: usuario.educadorId };
      req.conta = usuario;
      req.sessao = sessao;
      req.csrfToken = csrf(token);
      if (!permitirMfaPendente && mfaRequired() && usuario.papel === "administrador" && !sessao.mfaVerificada) return res.status(403).json({ sucesso: false, mensagem: "Confirme o segundo fator para continuar.", codigo: "MFA_NECESSARIO" });
      if (now - sessao.vistaEm.getTime() > 60 * 1000) await sessao.update({ vistaEm: new Date(now) });
      return next();
    } catch (error) { return next(error); }
  };
}
const autenticar = autenticarSessao();
const permitirPapeis = (...papeis) => (req, res, next) => {
  if (!papeis.includes(req.usuario?.papel)) return res.status(403).json({ sucesso: false, mensagem: "Você não tem permissão para esta ação." });
  return next();
};
module.exports = { autenticar, autenticarSessao, permitirPapeis };
