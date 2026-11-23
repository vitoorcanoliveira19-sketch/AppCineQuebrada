const { randomBytes, createHash, createHmac, timingSafeEqual } = require("node:crypto");
const { Op } = require("sequelize");
const { Sessao } = require("../models");
const { secret, production } = require("../config/security");
const SESSION_SECONDS = 8 * 60 * 60;
const IDLE_MS = 2 * 60 * 60 * 1000;
const cookieName = () => production() ? "__Host-cinequebrada" : "cinequebrada";
const hash = value => createHash("sha256").update(value).digest("hex");
const csrf = token => createHmac("sha256", secret()).update("csrf:" + token).digest("hex");
const equal = (a, b) => typeof a === "string" && typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function cookieToken(req) {
  const pair = (req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith(cookieName() + "="));
  return pair?.slice(cookieName().length + 1);
}
function setCookie(res, token, seconds = SESSION_SECONDS) {
  res.cookie(cookieName(), token, { httpOnly: true, secure: production(), sameSite: "lax", path: "/", maxAge: seconds * 1000 });
}
function clearCookie(res) {
  res.clearCookie(cookieName(), { httpOnly: true, secure: production(), sameSite: "lax", path: "/" });
}
async function criarSessao(usuario, cliente, res) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await Sessao.create({ id: hash(token), usuarioId: usuario.id, versao: usuario.authVersion,
    cliente, expiraEm: new Date(now.getTime() + SESSION_SECONDS * 1000), vistaEm: now });
  if (cliente === "web") setCookie(res, token);
  return { ...(cliente === "native" ? { token } : {}), csrfToken: csrf(token), expiraEm: SESSION_SECONDS };
}
async function revogarTodas(usuarioId, transaction) {
  await Sessao.destroy({ where: { usuarioId }, transaction });
}
async function limparExpiradas() {
  await Sessao.destroy({ where: { expiraEm: { [Op.lt]: new Date() } } });
}
module.exports = { SESSION_SECONDS, IDLE_MS, hash, csrf, equal, cookieToken, setCookie, clearCookie, criarSessao, revogarTodas, limparExpiradas };
