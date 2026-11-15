const { validationResult } = require("express-validator");
const { Matricula, Participante, Turma, Atividade } = require("../models");

const include = [
  { model: Participante, as: "participante", attributes: ["id", "nome", "email", "status", "ativo"] },
  { model: Turma, as: "turma", attributes: ["id", "nome", "ativa"], include: [{ model: Atividade, as: "atividade", attributes: ["id", "nome"] }] },
];

function filtros(req) {
  const where = {};
  if (req.query.participanteId) where.participanteId = Number(req.query.participanteId);
  if (req.query.turmaId) where.turmaId = Number(req.query.turmaId);
  if (["ativa", "encerrada"].includes(req.query.situacao)) where.situacao = req.query.situacao;
  return where;
}

async function listar(req, res, next) {
  try {
    const dados = await Matricula.findAll({ where: filtros(req), include, order: [["matriculadaEm", "DESC"], ["id", "DESC"]] });
    return res.json({ sucesso: true, dados });
  } catch (error) { return next(error); }
}

async function criar(req, res, next) {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Selecione um participante e uma turma válidos.", erros: erros.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
    const [participante, turma] = await Promise.all([Participante.findByPk(req.body.participanteId), Turma.findByPk(req.body.turmaId)]);
    if (!participante) return res.status(404).json({ sucesso: false, mensagem: "Participante não encontrado." });
    if (participante.status !== "aprovado" || !participante.ativo) return res.status(409).json({ sucesso: false, mensagem: "Somente participantes aprovados e ativos podem ser matriculados." });
    if (!turma) return res.status(404).json({ sucesso: false, mensagem: "Turma não encontrada." });
    if (!turma.ativa) return res.status(409).json({ sucesso: false, mensagem: "Somente turmas ativas aceitam matrículas." });
    const ativa = await Matricula.findOne({ where: { participanteId: participante.id, turmaId: turma.id, situacao: "ativa" } });
    if (ativa) return res.status(409).json({ sucesso: false, mensagem: "Este participante já possui matrícula ativa nesta turma." });
    const dados = await Matricula.create({ participanteId: participante.id, turmaId: turma.id });
    await dados.reload({ include });
    return res.status(201).json({ sucesso: true, mensagem: "Matrícula criada com sucesso.", dados });
  } catch (error) { return next(error); }
}

async function atualizarSituacao(req, res, next) {
  try {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, mensagem: "Informe a situação ativa ou encerrada.", erros: erros.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
    const matricula = await Matricula.findByPk(req.params.id);
    if (!matricula) return res.status(404).json({ sucesso: false, mensagem: "Matrícula não encontrada." });
    const situacao = req.body.situacao;
    if (matricula.situacao !== situacao) {
      if (situacao === "ativa") {
        const [participante, turma, duplicada] = await Promise.all([
          Participante.findByPk(matricula.participanteId), Turma.findByPk(matricula.turmaId),
          Matricula.findOne({ where: { participanteId: matricula.participanteId, turmaId: matricula.turmaId, situacao: "ativa" } }),
        ]);
        if (!participante || participante.status !== "aprovado" || !participante.ativo) return res.status(409).json({ sucesso: false, mensagem: "Somente participantes aprovados e ativos podem ter matrícula ativa." });
        if (!turma || !turma.ativa) return res.status(409).json({ sucesso: false, mensagem: "Somente turmas ativas podem ter matrículas ativas." });
        if (duplicada && duplicada.id !== matricula.id) return res.status(409).json({ sucesso: false, mensagem: "Este participante já possui matrícula ativa nesta turma." });
        await matricula.update({ situacao, encerradaEm: null });
      } else await matricula.update({ situacao, encerradaEm: new Date() });
    }
    await matricula.reload({ include });
    return res.json({ sucesso: true, mensagem: "Situação da matrícula atualizada.", dados: matricula });
  } catch (error) { return next(error); }
}

module.exports = { listar, criar, atualizarSituacao };
