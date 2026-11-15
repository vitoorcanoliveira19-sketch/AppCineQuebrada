const { validationResult } = require("express-validator");
const { Participante } = require("../models");

const cadastrarParticipante = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ sucesso: false, mensagem: "Confira os dados informados.", erros: errors.array().map(({ path, msg }) => ({ campo: path, mensagem: msg })) });
    }

    const camposPermitidos = ["nome", "dataNascimento", "rg", "celular", "telefone", "email", "cep", "bairro", "logradouro", "numero", "genero", "responsavelNome", "responsavelTelefone", "atividadeInteresse"];
    const dados = Object.fromEntries(camposPermitidos.filter((campo) => req.body[campo] !== undefined).map((campo) => [campo, typeof req.body[campo] === "string" ? req.body[campo].trim() : req.body[campo]]));
    dados.nome = dados.nome.replace(/\s+/g, " ");
    dados.email = dados.email.toLowerCase();
    dados.cep = dados.cep.replace(/\D/g, "");
    dados.status = "pendente";
    const participante = await Participante.create(dados);
    return res.status(201).json({
      sucesso: true,
      mensagem: "Inscrição enviada para análise da equipe CineQuebrada.",
      dados: { id: participante.id, status: participante.status },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { cadastrarParticipante };
