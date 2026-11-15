const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { Usuario } = require("../models");

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Informe email e senha válidos." });
    const usuario = await Usuario.findOne({ where: { email: req.body.email.trim().toLowerCase() } });
    if (!usuario || usuario.papel === "bloqueado" || !(await bcrypt.compare(req.body.senha, usuario.senha))) return res.status(401).json({ sucesso: false, mensagem: "Email ou senha incorretos." });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ sucesso: false, mensagem: "Autenticação indisponível." });
    const token = jwt.sign({ sub: usuario.id, papel: usuario.papel, nome: usuario.nome }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" });
    return res.json({ sucesso: true, token, expiraEm: 28800, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel } });
  } catch (error) { return next(error); }
};

const perfilAtual = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.sub, { attributes: ["id", "nome", "email", "papel"] });
    if (!usuario) return res.status(401).json({ sucesso: false, mensagem: "Sessão inválida." });
    return res.json({ sucesso: true, usuario });
  } catch (error) { return next(error); }
};

const criarEducador = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Confira nome, email e senha (mínimo de 12 caracteres)." });
    const usuario = await Usuario.create({ nome: req.body.nome.trim(), email: req.body.email.trim().toLowerCase(), senha: await bcrypt.hash(req.body.senha, 12), papel: "educador" });
    return res.status(201).json({ sucesso: true, dados: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel } });
  } catch (error) { return next(error); }
};

module.exports = { login, perfilAtual, criarEducador };
