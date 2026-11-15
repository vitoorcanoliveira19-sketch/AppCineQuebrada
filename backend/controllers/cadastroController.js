const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { UniqueConstraintError } = require("sequelize");
const { Usuario } = require("../models");

const cadastrarUsuario = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Dados de cadastro invalidos.",
        erros: errors.array().map((error) => ({
          campo: error.path,
          mensagem: error.msg,
        })),
      });
    }

    const { nome, email, senha } = req.body;
    const emailNormalizado = email.trim().toLowerCase();

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const usuario = await Usuario.create({
      nome: nome.trim(),
      email: emailNormalizado,
      senha: senhaCriptografada,
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: "Cadastro realizado com sucesso.",
      dados: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Ja existe um cadastro com este email.",
      });
    }

    return next(error);
  }
};

module.exports = {
  cadastrarUsuario,
};
