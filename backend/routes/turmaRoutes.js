const express = require("express");
const { body } = require("express-validator");
const { autenticar, permitirPapeis } = require("../middlewares/auth");
const controller = require("../controllers/turmaController");
const router = express.Router();
router.use("/admin/turmas", autenticar, permitirPapeis("administrador", "educador"));
router.get("/admin/turmas", controller.listar);
router.get("/admin/turmas/:id", controller.consultar);
const validadores = [
  body("nome").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Informe um nome entre 2 e 120 caracteres."),
  body("atividadeId").isInt({ min: 1 }).toInt().withMessage("Selecione uma atividade válida."),
  body("educadorId").isInt({ min: 1 }).toInt().withMessage("Selecione um educador válido."),
  body("salaId").isInt({ min: 1 }).toInt().withMessage("Selecione uma sala válida."),
  body("ativa").optional().isBoolean().withMessage("Situação inválida."),
];
router.post("/admin/turmas", permitirPapeis("administrador"), (req, res, next) => Promise.all(validadores.map(v => v.run(req))).then(() => next()).catch(next), controller.criar);
router.put("/admin/turmas/:id", permitirPapeis("administrador"), (req, res, next) => Promise.all(validadores.map(v => v.run(req))).then(() => next()).catch(next), controller.atualizar);
router.patch("/admin/turmas/:id", permitirPapeis("administrador"), (req, res, next) => body("ativa").isBoolean().withMessage("Informe a situação ativa ou inativa.").run(req).then(() => next()).catch(next), controller.atualizar);
module.exports = router;
