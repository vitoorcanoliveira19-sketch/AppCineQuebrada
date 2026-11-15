const { validationResult } = require("express-validator");
const { Atividade, Sala, Educador } = require("../models");

const recursos = {
  atividades: { model: Atividade, campos: ["nome", "descricao", "ativa"] },
  salas: { model: Sala, campos: ["nome", "ativa"] },
  educadores: { model: Educador, campos: ["nome", "email", "contato", "ativo"] },
};
const respostaValidacao = (req, res) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return false;
  res.status(400).json({ sucesso: false, mensagem: "Confira os campos informados.", erros: erros.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
  return true;
};
const configuracao = (req) => recursos[req.params.recurso];

async function listar(req, res, next) {
  try {
    const { model } = configuracao(req);
    const dados = await model.findAll({ order: [["nome", "ASC"]] });
    return res.json({ sucesso: true, dados });
  } catch (error) { return next(error); }
}
async function consultar(req, res, next) {
  try {
    const { model } = configuracao(req);
    const dado = await model.findByPk(req.params.id);
    if (!dado) return res.status(404).json({ sucesso: false, mensagem: "Cadastro não encontrado." });
    return res.json({ sucesso: true, dados: dado });
  } catch (error) { return next(error); }
}
async function criar(req, res, next) {
  try {
    if (respostaValidacao(req, res)) return;
    const { model, campos } = configuracao(req);
    const dados = Object.fromEntries(campos.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, typeof req.body[campo] === "string" ? req.body[campo].trim() : req.body[campo]]));
    if (dados.nome) dados.nome = dados.nome.replace(/\s+/g, " ");
    if (dados.email) dados.email = dados.email.toLowerCase();
    const registro = await model.create(dados);
    return res.status(201).json({ sucesso: true, mensagem: "Cadastro criado com sucesso.", dados: registro });
  } catch (error) { return next(error); }
}
async function atualizar(req, res, next) {
  try {
    if (respostaValidacao(req, res)) return;
    const { model, campos } = configuracao(req);
    const registro = await model.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ sucesso: false, mensagem: "Cadastro não encontrado." });
    const dados = Object.fromEntries(campos.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, typeof req.body[campo] === "string" ? req.body[campo].trim() : req.body[campo]]));
    if (dados.nome) dados.nome = dados.nome.replace(/\s+/g, " ");
    if (dados.email) dados.email = dados.email.toLowerCase();
    await registro.update(dados);
    return res.json({ sucesso: true, mensagem: "Cadastro atualizado com sucesso.", dados: registro });
  } catch (error) { return next(error); }
}

module.exports = { listar, consultar, criar, atualizar };
