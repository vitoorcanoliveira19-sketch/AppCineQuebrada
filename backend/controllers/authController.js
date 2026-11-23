const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { Usuario, Educador, sequelize } = require("../models");
const { criarSessao, clearCookie, revogarTodas } = require("../services/sessions");
const { hashSenha } = require("../services/passwords");
const { originAllowed } = require("../config/security");
// Equalize the expensive password check for missing/blocked users as well.
const dummyHash = bcrypt.hashSync("synthetic-constant-for-timing-only", 12);
const perfil = usuario => ({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel, educadorId: usuario.educadorId });
const invalid = (req, res) => {
  if (validationResult(req).isEmpty()) return false;
  res.status(400).json({ sucesso: false, mensagem: "Confira os dados informados." }); return true;
};
async function login(req, res, next) {
  try {
    if (invalid(req, res)) return;
    if (req.headers.origin && !originAllowed(req.headers.origin)) return res.status(403).json({ sucesso: false, mensagem: "Origem não permitida." });
    const usuario = await Usuario.findOne({ where: { email: req.body.email.trim().toLowerCase() } });
    const senhaCorreta = await bcrypt.compare(req.body.senha, usuario?.senha || dummyHash);
    if (!usuario || usuario.papel === "bloqueado" || !senhaCorreta) return res.status(401).json({ sucesso: false, mensagem: "Email ou senha incorretos." });
    const cliente = req.headers.origin || req.body.cliente === "web" ? "web" : "native";
    const dados = await criarSessao(usuario, cliente, res);
    return res.json({ sucesso: true, ...dados, usuario: perfil(usuario) });
  } catch (error) { return next(error); }
}
async function perfilAtual(req, res) {
  return res.json({ sucesso: true, usuario: perfil(req.conta), csrfToken: req.csrfToken });
}
async function logout(req, res, next) {
  try { await req.sessao.destroy(); clearCookie(res); return res.json({ sucesso: true }); } catch (error) { return next(error); }
}
async function criarEducador(req, res, next) {
  try {
    if (invalid(req, res)) return;
    const email = req.body.email.trim().toLowerCase();
    const educador = req.body.educadorId ? await Educador.findByPk(req.body.educadorId) : await Educador.findOne({ where: { email } });
    if (!educador?.ativo) return res.status(400).json({ sucesso: false, mensagem: "Crie ou selecione primeiro o cadastro de um educador ativo." });
    const usuario = await Usuario.create({ nome: req.body.nome.trim(), email, senha: await hashSenha(req.body.senha), papel: "educador", educadorId: educador.id });
    return res.status(201).json({ sucesso: true, dados: perfil(usuario) });
  } catch (error) { return next(error); }
}
async function alterarSenha(req, res, next) {
  try {
    if (invalid(req, res)) return;
    const senha = await hashSenha(req.body.novaSenha);
    await sequelize.transaction(async transaction => {
      const usuario = await Usuario.findByPk(req.usuario.sub, { transaction, lock: transaction.LOCK.UPDATE });
      if (!(await bcrypt.compare(req.body.senhaAtual, usuario.senha))) {
        const error = new Error("Senha atual incorreta."); error.status = 401; throw error;
      }
      await usuario.update({ senha, authVersion: usuario.authVersion + 1 }, { transaction });
      await revogarTodas(usuario.id, transaction);
    });
    clearCookie(res);
    return res.json({ sucesso: true, mensagem: "Senha alterada. Entre novamente em todos os dispositivos." });
  } catch (error) { return next(error); }
}
async function situacaoConta(req, res, next) {
  try {
    if (invalid(req, res)) return;
    if (Number(req.params.id) === req.usuario.sub) return res.status(409).json({ sucesso: false, mensagem: "Você não pode bloquear sua própria conta." });
    await sequelize.transaction(async transaction => {
      const usuario = await Usuario.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!usuario || usuario.papel === "administrador") { const error = new Error("Selecione uma conta de educador."); error.status = 400; throw error; }
      if (req.body.ativo && !await Educador.findOne({ where: { id: usuario.educadorId || -1, ativo: true }, transaction })) {
        const error = new Error("Vincule a conta a um educador ativo antes de reativá-la."); error.status = 409; throw error;
      }
      const papel = req.body.ativo ? "educador" : "bloqueado";
      await usuario.update({ papel, authVersion: usuario.authVersion + 1 }, { transaction });
      await revogarTodas(usuario.id, transaction);
    });
    return res.json({ sucesso: true });
  } catch (error) { return next(error); }
}
async function listarContas(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const resultado = await Usuario.findAndCountAll({ attributes: ["id", "nome", "email", "papel", "educadorId"],
      include: [{ model: Educador, as: "educador", attributes: ["id", "nome", "ativo"] }],
      order: [["id", "ASC"]], limit: 50, offset: (page - 1) * 50 });
    return res.json({ sucesso: true, dados: resultado.rows, paginacao: { page, paginas: Math.ceil(resultado.count / 50) } });
  } catch (error) { return next(error); }
}
module.exports = { login, perfilAtual, logout, criarEducador, alterarSenha, situacaoConta, listarContas };
