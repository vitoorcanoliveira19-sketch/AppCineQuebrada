const express = require("express");

const router = express.Router();

// Mantido como rota desativada para evitar cadastros públicos de contas internas.
router.post("/cadastro", (_req, res) => res.status(410).json({ sucesso: false, mensagem: "Cadastro público de usuários internos desativado." }));

module.exports = router;
