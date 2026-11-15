const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { Participante } = require("../models");

const camposLista = ["id", "nome", "email", "celular", "telefone", "dataNascimento", "atividadeInteresse", "status", "ativo", "analisadoEm", "analisadoPorId", "createdAt"];

async function listar(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const where = {};
    if (["pendente", "aprovado", "recusado"].includes(req.query.status)) where.status = req.query.status;
    else if (req.query.status && req.query.status !== "todos") return res.status(400).json({ sucesso: false, mensagem: "Filtro de status inválido." });
    if (req.query.nome) where.nome = { [Op.like]: `%${String(req.query.nome).trim().slice(0, 80)}%` };
    if (req.query.atividade) where.atividadeInteresse = String(req.query.atividade).slice(0, 120);
    const resultado = await Participante.findAndCountAll({ where, attributes: camposLista, order: [["createdAt", "DESC"], ["id", "DESC"]], limit, offset: (page - 1) * limit });
    return res.json({ sucesso: true, dados: resultado.rows, paginacao: { page, limit, total: resultado.count, paginas: Math.ceil(resultado.count / limit) } });
  } catch (error) { return next(error); }
}

async function consultar(req, res, next) {
  try {
    const participante = await Participante.findByPk(req.params.id, { attributes: ["id", "nome", "email", "celular", "telefone", "dataNascimento", "atividadeInteresse", "status", "ativo", "analisadoEm", "analisadoPorId", "createdAt"] });
    if (!participante) return res.status(404).json({ sucesso: false, mensagem: "Participante não encontrado." });
    return res.json({ sucesso: true, dados: participante });
  } catch (error) { return next(error); }
}

async function analisar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Informe uma decisão válida.", erros: errors.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
    const { status } = req.body;
    const [alterados] = await Participante.update({ status, analisadoEm: new Date(), analisadoPorId: Number(req.usuario.sub) }, { where: { id: req.params.id, status: "pendente" } });
    if (!alterados) {
      const atual = await Participante.findByPk(req.params.id, { attributes: ["id", "status"] });
      if (!atual) return res.status(404).json({ sucesso: false, mensagem: "Inscrição não encontrada." });
      return res.status(409).json({ sucesso: false, mensagem: `Inscrição já analisada (status: ${atual.status}).` });
    }
    return res.json({ sucesso: true, dados: { id: Number(req.params.id), status, analisadoEm: new Date(), analisadoPorId: Number(req.usuario.sub) } });
  } catch (error) { return next(error); }
}

async function atualizarAprovado(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Confira os dados informados.", erros: errors.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
    const campos = ["nome", "email", "celular", "telefone", "atividadeInteresse"];
    const dados = Object.fromEntries(campos.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, typeof req.body[campo] === "string" ? req.body[campo].trim() : req.body[campo]]));
    if (!Object.keys(dados).length) return res.status(400).json({ sucesso: false, mensagem: "Informe ao menos um campo para atualizar." });
    if (dados.email) dados.email = dados.email.toLowerCase();
    const [alterados] = await Participante.update(dados, { where: { id: req.params.id, status: "aprovado", ativo: true } });
    if (!alterados) {
      const existente = await Participante.findByPk(req.params.id, { attributes: ["id", "status"] });
      return res.status(existente ? 409 : 404).json({ sucesso: false, mensagem: existente ? "Somente participantes aprovados e ativos podem ser editados." : "Participante não encontrado." });
    }
    return consultar(req, res, next);
  } catch (error) { return next(error); }
}

async function inativar(req, res, next) {
  try {
    const [alterados] = await Participante.update({ ativo: false }, { where: { id: req.params.id, status: "aprovado", ativo: true } });
    if (!alterados) {
      const existente = await Participante.findByPk(req.params.id, { attributes: ["id", "status", "ativo"] });
      return res.status(existente ? 409 : 404).json({ sucesso: false, mensagem: existente ? "Participante não está ativo e aprovado." : "Participante não encontrado." });
    }
    return res.json({ sucesso: true, dados: { id: Number(req.params.id), ativo: false } });
  } catch (error) { return next(error); }
}

module.exports = { listar, consultar, analisar, atualizarAprovado, inativar };
