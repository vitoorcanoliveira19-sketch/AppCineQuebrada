const express = require("express");
const { body } = require("express-validator");
const { cadastrarParticipante } = require("../controllers/participanteController");

const router = express.Router();

const atividades = ["Futebol", "Karatê", "Capoeira", "Ballet", "FitDance", "Horta Orgânica", "Reforço escolar", "CineQuebrada"];
const telefones = (value) => typeof value === "string" && value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 13;
const dataValida = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ano, mes, dia] = value.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia && data <= new Date();
};

router.post("/participantes", [
  body("nome").isString().trim().isLength({ min: 2, max: 255 }).withMessage("Informe o nome completo."),
  body("dataNascimento").custom(dataValida).withMessage("Informe uma data de nascimento válida, no formato AAAA-MM-DD, que não seja futura."),
  body("rg").optional({ values: "falsy" }).isString().isLength({ max: 30 }).withMessage("Confira o RG informado."),
  body("celular").custom(telefones).withMessage("Informe um celular válido com DDD."),
  body("telefone").optional({ values: "falsy" }).custom(telefones).withMessage("Confira o telefone informado."),
  body("email").isString().trim().isEmail().isLength({ max: 255 }).withMessage("Informe um email válido."),
  body("cep").isString().matches(/^\d{5}-?\d{3}$/).withMessage("Informe um CEP válido."),
  body("bairro").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Informe o bairro."),
  body("logradouro").isString().trim().isLength({ min: 2, max: 255 }).withMessage("Informe o logradouro."),
  body("numero").isString().trim().isLength({ min: 1, max: 20 }).withMessage("Informe o número do endereço."),
  body("genero").optional({ values: "falsy" }).isIn(["Masculino", "Feminino", "Outro"]).withMessage("Selecione uma opção de gênero válida."),
  body("responsavelNome").optional({ values: "falsy" }).isString().trim().isLength({ min: 2, max: 255 }).withMessage("Confira o nome do responsável."),
  body("responsavelTelefone").optional({ values: "falsy" }).custom(telefones).withMessage("Informe um telefone válido para o responsável."),
  body("responsavelTelefone").custom((_, { req }) => {
    const [ano, mes, dia] = String(req.body.dataNascimento || "").split("-").map(Number);
    const hoje = new Date();
    const idade = hoje.getFullYear() - ano - (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia) ? 1 : 0);
    const nomeResponsavel = req.body.responsavelNome;
    if (idade < 18 && (typeof nomeResponsavel !== "string" || nomeResponsavel.trim().length < 2 || !telefones(req.body.responsavelTelefone))) return false;
    return true;
  }).withMessage("Para menores de 18 anos, informe nome e telefone válidos do responsável."),
  body("atividadeInteresse").isIn(atividades).withMessage("Selecione uma atividade de interesse."),
], cadastrarParticipante);

module.exports = router;
