const { UniqueConstraintError } = require("sequelize");
const { Op } = require("sequelize");
const { Chamada, Presenca, Matricula, Participante, Turma, Atividade, Educador, Usuario, sequelize } = require("../models");

const formatoData = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const includeTurma = [{ model: Atividade, as: "atividade", attributes: ["id", "nome"] }, { model: Educador, as: "educador", attributes: ["id", "nome", "email"] }];

async function turmasPermitidas(req) {
  const where = {};
  if (req.usuario.papel === "educador") {
    const usuario = await Usuario.findByPk(req.usuario.sub, { attributes: ["email"] });
    if (!usuario) return { id: -1 };
    const educador = await Educador.findOne({ where: { email: usuario.email, ativo: true } });
    if (!educador) return { id: -1 };
    where.educadorId = educador.id;
  }
  return where;
}

async function listarTurmas(req, res, next) {
  try {
    const where = await turmasPermitidas(req);
    const dados = await Turma.findAll({ where, include: includeTurma, order: [["nome", "ASC"]] });
    return res.json({ sucesso: true, dados });
  } catch (error) { return next(error); }
}

async function listarParticipantes(req, res, next) {
  try {
    const permitidas = await turmasPermitidas(req);
    const matriculas = await Matricula.findAll({
      attributes: ["participanteId"],
      include: [
        { model: Participante, as: "participante", attributes: ["id", "nome"], where: { status: "aprovado" } },
        { model: Turma, as: "turma", attributes: [], where: permitidas },
      ],
      order: [[{ model: Participante, as: "participante" }, "nome", "ASC"]],
    });
    const unicos = new Map(matriculas.map(m => [m.participante.id, m.participante]));
    return res.json({ sucesso: true, dados: [...unicos.values()] });
  } catch (error) { return next(error); }
}

async function historico(req, res, next) {
  try {
    const { participanteId: participanteBruto, turmaId: turmaBruto, de, ate } = req.query;
    const participanteId = participanteBruto === undefined ? undefined : Number(participanteBruto);
    const turmaId = turmaBruto === undefined ? undefined : Number(turmaBruto);
    if ((participanteBruto !== undefined && (!Number.isInteger(participanteId) || participanteId < 1)) || (turmaBruto !== undefined && (!Number.isInteger(turmaId) || turmaId < 1)) || (!participanteId && !turmaId) || (de && !formatoData(de)) || (ate && !formatoData(ate)) || (de && ate && de > ate)) {
      return res.status(400).json({ sucesso: false, mensagem: "Informe participante ou turma e um intervalo de datas válido (AAAA-MM-DD)." });
    }
    const permitidas = await turmasPermitidas(req);
    const turmaWhere = { ...permitidas };
    if (turmaId) turmaWhere.id = turmaId;
    const chamadaWhere = {};
    if (de || ate) chamadaWhere.dataAula = { ...(de ? { [Op.gte]: de } : {}), ...(ate ? { [Op.lte]: ate } : {}) };
    const presencaWhere = {};
    if (participanteId) presencaWhere.participanteId = participanteId;
    const dados = await Presenca.findAll({
      attributes: ["id", "situacao"], where: presencaWhere,
      include: [
        { model: Chamada, as: "chamada", attributes: ["dataAula"], where: chamadaWhere, include: [{ model: Turma, as: "turma", attributes: ["id", "nome"], where: turmaWhere, include: [{ model: Atividade, as: "atividade", attributes: ["id", "nome"] }] }] },
        { model: Matricula, as: "matricula", attributes: ["id", "participanteId"], ...(participanteId ? { where: { participanteId } } : {}), include: [{ model: Participante, as: "participante", attributes: ["id", "nome"] }] },
      ],
      order: [[{ model: Chamada, as: "chamada" }, "dataAula", "DESC"], ["id", "DESC"]],
    });
    const registros = dados.map(p => ({ id: p.id, data: p.chamada.dataAula, atividade: p.chamada.turma.atividade.nome, turmaId: p.chamada.turma.id, turma: p.chamada.turma.nome, participanteId: p.matricula.participante.id, participante: p.matricula.participante.nome, situacao: p.situacao }));
    return res.json({ sucesso: true, dados: { registros, totais: { presencas: registros.filter(r => r.situacao === "presente").length, faltas: registros.filter(r => r.situacao === "ausente").length } } });
  } catch (error) { return next(error); }
}

async function carregar(req, res, next) {
  try {
    const turmaId = Number(req.query.turmaId);
    const dataAula = req.query.data;
    if (!Number.isInteger(turmaId) || turmaId < 1 || !formatoData(dataAula)) return res.status(400).json({ sucesso: false, mensagem: "Informe uma turma e uma data válidas (AAAA-MM-DD)." });
    const permitidas = await turmasPermitidas(req);
    const turma = await Turma.findOne({ where: { id: turmaId, ...permitidas }, include: includeTurma });
    if (!turma) return res.status(404).json({ sucesso: false, mensagem: "Turma não encontrada ou sem permissão de acesso." });
    const chamada = await Chamada.findOne({ where: { turmaId, dataAula }, include: [{ model: Presenca, as: "presencas", include: [{ model: Matricula, as: "matricula", attributes: ["id", "participanteId", "situacao"], include: [{ model: Participante, as: "participante", attributes: ["id", "nome"] }] }] }] });
    const matriculas = await Matricula.findAll({ where: { turmaId, situacao: "ativa" }, include: [{ model: Participante, as: "participante", attributes: ["id", "nome", "ativo", "status"], where: { ativo: true, status: "aprovado" } }], order: [[{ model: Participante, as: "participante" }, "nome", "ASC"]] });
    const marcadas = new Map((chamada?.presencas || []).map(p => [p.matriculaId, p.situacao]));
    return res.json({ sucesso: true, dados: { chamadaId: chamada?.id || null, turma, dataAula, participantes: matriculas.map(m => ({ matriculaId: m.id, participanteId: m.participanteId, nome: m.participante.nome, situacao: marcadas.get(m.id) || "presente" })) } });
  } catch (error) { return next(error); }
}

async function salvar(req, res, next) {
  const { turmaId, dataAula, presencas } = req.body;
  if (!Number.isInteger(turmaId) || turmaId < 1 || !formatoData(dataAula) || !Array.isArray(presencas) || presencas.some(p => !p || !Number.isInteger(p.matriculaId) || p.matriculaId < 1 || !["presente", "ausente"].includes(p.situacao)) || new Set(presencas.map(p => p.matriculaId)).size !== presencas.length) {
    return res.status(400).json({ sucesso: false, mensagem: "Informe turma, data e uma situação válida (presente ou ausente) para cada matrícula, sem repetições." });
  }
  const transaction = await sequelize.transaction();
  try {
    const permitidas = await turmasPermitidas(req);
    const turma = await Turma.findOne({ where: { id: turmaId, ...permitidas }, transaction });
    if (!turma) { await transaction.rollback(); return res.status(404).json({ sucesso: false, mensagem: "Turma não encontrada ou sem permissão de acesso." }); }
    const ativas = await Matricula.findAll({ where: { turmaId, situacao: "ativa" }, include: [{ model: Participante, as: "participante", attributes: ["id"], where: { ativo: true, status: "aprovado" } }], transaction });
    const esperadas = new Set(ativas.map(m => m.id));
    if (presencas.length !== esperadas.size || presencas.some(p => !esperadas.has(p.matriculaId))) {
      await transaction.rollback(); return res.status(409).json({ sucesso: false, mensagem: "A lista de matrículas mudou. Atualize a chamada antes de salvar." });
    }
    let chamada = await Chamada.findOne({ where: { turmaId, dataAula }, transaction, lock: transaction.LOCK.UPDATE });
    const criando = !chamada;
    if (criando) chamada = await Chamada.create({ turmaId, dataAula }, { transaction });
    else await chamada.reload({ transaction, lock: transaction.LOCK.UPDATE });
    await Presenca.destroy({ where: { chamadaId: chamada.id }, transaction });
    if (presencas.length) await Presenca.bulkCreate(presencas.map(p => ({ chamadaId: chamada.id, matriculaId: p.matriculaId, situacao: p.situacao })), { transaction });
    await transaction.commit();
    return res.status(criando ? 201 : 200).json({ sucesso: true, mensagem: criando ? "Chamada registrada com sucesso." : "Chamada atualizada com sucesso.", dados: { id: chamada.id, turmaId, dataAula } });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    if (error instanceof UniqueConstraintError || error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ sucesso: false, mensagem: "Já existe uma chamada para esta turma e data. Recarregue o registro para editá-lo." });
    return next(error);
  }
}

module.exports = { listarTurmas, listarParticipantes, historico, carregar, salvar };
