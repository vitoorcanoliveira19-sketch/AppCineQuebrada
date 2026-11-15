const express = require("express");
const { body, query, param } = require("express-validator");
const { autenticar, permitirPapeis } = require("../middlewares/auth");
const controller = require("../controllers/matriculaController");
const router = express.Router();

router.use("/admin/matriculas", autenticar, permitirPapeis("administrador"));
router.get("/admin/matriculas", [query("participanteId").optional().isInt({ min: 1 }).toInt(), query("turmaId").optional().isInt({ min: 1 }).toInt(), query("situacao").optional().isIn(["ativa", "encerrada"])], controller.listar);
router.post("/admin/matriculas", [body("participanteId").isInt({ min: 1 }).toInt(), body("turmaId").isInt({ min: 1 }).toInt()], controller.criar);
router.patch("/admin/matriculas/:id/situacao", [param("id").isInt({ min: 1 }).toInt(), body("situacao").isIn(["ativa", "encerrada"])], controller.atualizarSituacao);

module.exports = router;
