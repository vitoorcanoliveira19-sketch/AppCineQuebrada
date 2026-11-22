const { Op } = require("sequelize");
const { escopoEducador } = require("../services/educatorScope");
const { validationResult } = require("express-validator");
const { Turma, Atividade, Educador, Sala } = require("../models");

const includes = [
  { model: Atividade, as: "atividade", attributes: ["id", "nome"] },
  { model: Educador, as: "educador", attributes: ["id", "nome"] },
  { model: Sala, as: "sala", attributes: ["id", "nome"] },
];
const erroValidacao = (req, res) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return false;
  res.status(400).json({ sucesso: false, mensagem: "Confira os campos informados.", erros: erros.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
  return true;
};
async function validarVinculos(dados) {
  for (const [campo, model, ativo] of [["atividadeId", Atividade, "ativa"], ["educadorId", Educador, "ativo"], ["salaId", Sala, "ativa"]]) {
    if (dados[campo] === undefined) continue;
    const registro = await model.findByPk(dados[campo]);
    if (!registro) return `${campo}: registro não encontrado.`;
    if (!registro[ativo]) return `${campo}: o registro selecionado está inativo.`;
  }
  return null;
}
async function listar(req, res, next) {
  try { const where = await escopoEducador(req); const dados = await Turma.findAll({ where, include: includes, order: [["nome", "ASC"]] }); return res.json({ sucesso: true, dados }); }
  catch (error) { return next(error); }
}
async function consultar(req, res, next) {
  try { const where = await escopoEducador(req); const dados = await Turma.findOne({ where: { [Op.and]: [where, { id: req.params.id }] }, include: includes }); if (!dados) return res.status(404).json({ sucesso: false, mensagem: "Turma não encontrada." }); return res.json({ sucesso: true, dados }); }
  catch (error) { return next(error); }
}
async function criar(req, res, next) {
  try {
    if (erroValidacao(req, res)) return;
    const erro = await validarVinculos(req.body);
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    const turma = await Turma.create({ nome: req.body.nome.trim().replace(/\s+/g, " "), atividadeId: req.body.atividadeId, educadorId: req.body.educadorId, salaId: req.body.salaId, ativa: req.body.ativa });
    await turma.reload({ include: includes });
    return res.status(201).json({ sucesso: true, mensagem: "Turma criada com sucesso.", dados: turma });
  } catch (error) { return next(error); }
}
async function atualizar(req, res, next) {
  try {
    if (erroValidacao(req, res)) return;
    const turma = await Turma.findByPk(req.params.id);
    if (!turma) return res.status(404).json({ sucesso: false, mensagem: "Turma não encontrada." });
    const erro = await validarVinculos(req.body);
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    const dados = {};
    for (const campo of ["nome", "atividadeId", "educadorId", "salaId", "ativa"]) if (req.body[campo] !== undefined) dados[campo] = campo === "nome" ? req.body[campo].trim().replace(/\s+/g, " ") : req.body[campo];
    await turma.update(dados); await turma.reload({ include: includes });
    return res.json({ sucesso: true, mensagem: "Turma atualizada com sucesso.", dados: turma });
  } catch (error) { return next(error); }
}
module.exports = { listar, consultar, criar, atualizar };
