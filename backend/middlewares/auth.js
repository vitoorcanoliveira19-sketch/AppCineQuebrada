const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

const autenticar = async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ sucesso: false, mensagem: "Autenticação necessária." });
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ sucesso: false, mensagem: "Autenticação indisponível." });
    const sessao = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!Number.isInteger(Number(sessao.sub))) return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
    const usuario = await Usuario.findByPk(sessao.sub, { attributes: ["id", "nome", "email", "papel"] });
    if (!usuario || usuario.papel === "bloqueado") return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
    req.usuario = { sub: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
    return next();
  } catch (_error) {
    if (_error.name && _error.name.startsWith("Sequelize")) return next(_error);
    return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
  }
};

const permitirPapeis = (...papeis) => (req, res, next) => {
  if (!papeis.includes(req.usuario?.papel)) return res.status(403).json({ sucesso: false, mensagem: "Você não tem permissão para esta ação." });
  return next();
};

module.exports = { autenticar, permitirPapeis };
