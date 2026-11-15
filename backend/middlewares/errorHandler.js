const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error.name === "SequelizeConnectionError" || error.name === "SequelizeHostNotFoundError" || error.name === "SequelizeHostNotReachableError" || error.name === "SequelizeConnectionRefusedError" || error.name === "SequelizeTimeoutError") {
    return res.status(503).json({ sucesso: false, mensagem: "O serviço está temporariamente indisponível. Tente novamente em alguns instantes." });
  }

  if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ sucesso: false, mensagem: "Já existe um cadastro com esse nome ou email." });
  if (error.name === "SequelizeValidationError") return res.status(400).json({ sucesso: false, mensagem: "Confira os campos informados.", erros: error.errors.map(({ path, message }) => ({ campo: path, mensagem: message })) });

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ sucesso: false, mensagem: "Confira os dados enviados e tente novamente." });
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: "Erro interno do servidor.",
    detalhe:
      process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

module.exports = errorHandler;
