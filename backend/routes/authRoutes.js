const express = require("express");
const { body } = require("express-validator");
const { login, perfilAtual, criarEducador } = require("../controllers/authController");
const participantes = require("../controllers/participanteAdminController");
const { autenticar, permitirPapeis } = require("../middlewares/auth");

const router = express.Router();
router.post("/auth/login", [body("email").isEmail(), body("senha").isString().isLength({ min: 1, max: 200 })], login);
router.get("/auth/me", autenticar, perfilAtual);
router.get("/admin/participantes", autenticar, permitirPapeis("administrador"), participantes.listar);
router.get("/admin/participantes/:id", autenticar, permitirPapeis("administrador"), participantes.consultar);
router.patch("/admin/participantes/:id/status", autenticar, permitirPapeis("administrador"), [body("status").isIn(["aprovado", "recusado"])], participantes.analisar);
router.put("/admin/participantes/:id", autenticar, permitirPapeis("administrador"), [body("nome").optional().isString().trim().isLength({ min: 2, max: 255 }), body("email").optional().isEmail().isLength({ max: 255 }), body("celular").optional().isString().matches(/^\\+?[0-9 ()-]{10,30}$/), body("telefone").optional({ values: "falsy" }).isString().matches(/^\\+?[0-9 ()-]{7,30}$/), body("atividadeInteresse").optional().isString().isLength({ min: 1, max: 120 })], participantes.atualizarAprovado);
router.patch("/admin/participantes/:id/inativar", autenticar, permitirPapeis("administrador"), participantes.inativar);
router.post("/admin/educadores", autenticar, permitirPapeis("administrador"), [body("nome").isString().trim().isLength({ min: 2, max: 255 }), body("email").isEmail(), body("senha").isString().isLength({ min: 12, max: 200 })], criarEducador);
module.exports = router;
