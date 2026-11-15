const express = require("express");
const { body } = require("express-validator");
const { autenticar, permitirPapeis } = require("../middlewares/auth");
const controller = require("../controllers/cadastrosAdminController");

const router = express.Router();
router.use("/admin/cadastros/:recurso(atividades|salas|educadores)", autenticar, permitirPapeis("administrador", "educador"));
router.get("/admin/cadastros/:recurso(atividades|salas|educadores)", controller.listar);
router.get("/admin/cadastros/:recurso(atividades|salas|educadores)/:id", controller.consultar);

const validators = {
  atividades: [body("nome").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Informe um nome entre 2 e 120 caracteres."), body("descricao").optional({ values: "null" }).isString().isLength({ max: 5000 }).withMessage("A descrição deve ter até 5000 caracteres."), body("ativa").optional().isBoolean().withMessage("Situação inválida.")],
  salas: [body("nome").isString().trim().isLength({ min: 1, max: 120 }).withMessage("Informe uma identificação de sala com até 120 caracteres."), body("ativa").optional().isBoolean().withMessage("Situação inválida.")],
  educadores: [body("nome").isString().trim().isLength({ min: 2, max: 255 }).withMessage("Informe o nome do educador."), body("email").isEmail().normalizeEmail().isLength({ max: 255 }).withMessage("Informe um email válido."), body("contato").isString().trim().isLength({ min: 3, max: 60 }).withMessage("Informe um contato de até 60 caracteres."), body("ativo").optional().isBoolean().withMessage("Situação inválida.")],
};
router.post("/admin/cadastros/:recurso(atividades|salas|educadores)", (req, res, next) => { if (!validators[req.params.recurso]) return res.status(404).json({ sucesso: false, mensagem: "Tipo de cadastro não encontrado." }); return next(); }, (req, res, next) => Promise.all(validators[req.params.recurso].map((validator) => validator.run(req))).then(() => next()).catch(next), controller.criar);
router.put("/admin/cadastros/:recurso(atividades|salas|educadores)/:id", (req, res, next) => Promise.all(validators[req.params.recurso].map((validator) => validator.run(req))).then(() => next()).catch(next), controller.atualizar);
router.patch("/admin/cadastros/:recurso(atividades|salas|educadores)/:id", (req, res, next) => {
  const campo = req.params.recurso === "atividades" ? "ativa" : req.params.recurso === "salas" ? "ativa" : "ativo";
  return body(campo).isBoolean().withMessage("Informe a situação ativa ou inativa.").run(req).then(() => next()).catch(next);
}, controller.atualizar);
module.exports = router;
