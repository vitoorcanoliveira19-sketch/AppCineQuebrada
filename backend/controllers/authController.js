const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { Usuario, Educador, Sessao, sequelize } = require("../models");
const { criarSessao, clearCookie, revogarTodas } = require("../services/sessions");
const { hashSenha } = require("../services/passwords");
const { originAllowed, mfaRequired } = require("../config/security");
const mfa = require("../services/mfa");
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
    const exigeMfa = mfaRequired() && usuario.papel === "administrador";
    const dados = await criarSessao(usuario, cliente, res);
    return res.json({ sucesso: true, ...dados, usuario: perfil(usuario),
      precisaMfa: exigeMfa, configurarMfa: exigeMfa && !usuario.mfaSecret });
  } catch (error) { return next(error); }
}
async function perfilAtual(req, res) {
  const exigeMfa = mfaRequired() && req.conta.papel === "administrador";
  return res.json({ sucesso: true, usuario: perfil(req.conta), csrfToken: req.csrfToken,
    precisaMfa: exigeMfa && !req.sessao.mfaVerificada,
    configurarMfa: exigeMfa && !req.conta.mfaSecret });
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
async function iniciarMfa(req, res, next) {
  try {
    if (req.conta.mfaSecret) return res.status(409).json({ sucesso: false, mensagem: "Segundo fator já configurado." });
    // Concurrent page loads must receive the same pending secret.
    const secret = await sequelize.transaction(async transaction => {
      const sessao = await Sessao.findByPk(req.sessao.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sessao) { const error = new Error("Sessão expirada."); error.status = 401; throw error; }
      if (sessao.mfaPendente) return mfa.decrypt(sessao.mfaPendente);
      const value = new (require("otpauth").Secret)({ size: 20 }).base32;
      await sessao.update({ mfaPendente: mfa.encrypt(value) }, { transaction });
      return value;
    });
    return res.json({ sucesso: true, segredo: secret, uri: mfa.totp(secret, req.conta.email).toString() });
  } catch (error) { return next(error); }
}
async function confirmarMfa(req, res, next) {
  try {
    if (invalid(req, res)) return;
    let codes;
    await sequelize.transaction(async transaction => {
      const usuario = await Usuario.findByPk(req.usuario.sub, { transaction, lock: transaction.LOCK.UPDATE });
      if (usuario.mfaSecret || !req.sessao.mfaPendente) { const error = new Error("Reinicie a configuração do segundo fator."); error.status = 409; throw error; }
      const encrypted = req.sessao.mfaPendente;
      const counter = mfa.counterValido({ ...usuario.get(), mfaSecret: encrypted }, req.body.codigo);
      if (counter === null) { const error = new Error("Código inválido ou expirado."); error.status = 400; throw error; }
      const recovery = mfa.recoveryCodes(); codes = recovery.codes;
      await usuario.update({ mfaSecret: encrypted, mfaLastCounter: counter, mfaRecoveryCodes: recovery.hashes, authVersion: usuario.authVersion + 1 }, { transaction });
      await Sessao.destroy({ where: { usuarioId: usuario.id, id: { [Op.ne]: req.sessao.id } }, transaction });
      await req.sessao.update({ versao: usuario.authVersion, mfaVerificada: true, mfaPendente: null }, { transaction });
    });
    return res.json({ sucesso: true, codigosRecuperacao: codes });
  } catch (error) { return next(error); }
}
async function verificarMfa(req, res, next) {
  try {
    if (invalid(req, res)) return;
    await sequelize.transaction(async transaction => {
      const usuario = await Usuario.findByPk(req.usuario.sub, { transaction, lock: transaction.LOCK.UPDATE });
      if (!usuario.mfaSecret) { const error = new Error("Configure primeiro o segundo fator."); error.status = 409; throw error; }
      const codigo = req.body.codigo;
      const counter = mfa.counterValido(usuario, codigo);
      const hashes = usuario.mfaRecoveryCodes || [];
      const recovery = hashes.indexOf(mfa.recoveryHash(codigo));
      if (counter === null && recovery < 0) { const error = new Error("Código inválido, expirado ou já utilizado."); error.status = 401; throw error; }
      if (counter !== null) await usuario.update({ mfaLastCounter: counter }, { transaction });
      else await usuario.update({ mfaRecoveryCodes: hashes.filter((_, i) => i !== recovery) }, { transaction });
      await req.sessao.update({ mfaVerificada: true }, { transaction });
    });
    return res.json({ sucesso: true });
  } catch (error) { return next(error); }
}
module.exports = { login, perfilAtual, logout, criarEducador, alterarSenha, situacaoConta, listarContas, iniciarMfa, confirmarMfa, verificarMfa };
