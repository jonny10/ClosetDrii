const express = require("express");
const router = express.Router();

const tamanhosController = require("../../controllers/api/tamanhos.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

// Público: selects e chips de tamanho das páginas
router.get("/tamanhos", logger, tamanhosController.listarTamanhos);

// Admin (CRUD de tamanhos)
router.post("/admin/tamanhos", logger, requireAdmin, tamanhosController.criarTamanho);
router.patch("/admin/tamanhos/:id", logger, requireAdmin, tamanhosController.atualizarTamanho);
router.delete("/admin/tamanhos/:id", logger, requireAdmin, tamanhosController.removerTamanho);

module.exports = router;
