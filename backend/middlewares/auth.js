const jwt = require("jsonwebtoken");

const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ sucesso: false, mensagem: "Autenticação necessária." });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    return next();
  } catch (_error) {
    return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida ou expirada." });
  }
};

const permitirPapeis = (...papeis) => (req, res, next) => {
  if (!papeis.includes(req.usuario?.papel)) return res.status(403).json({ sucesso: false, mensagem: "Você não tem permissão para esta ação." });
  return next();
};

module.exports = { autenticar, permitirPapeis };
