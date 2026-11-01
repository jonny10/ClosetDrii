const express = require("express");
const router = express.Router();

const categoriasController = require("../../controllers/api/categorias.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/categorias", logger, categoriasController.listarCategorias);
router.get("/categorias/:id", logger, categoriasController.buscarCategoria);

// Admin (CRUD de categorias)
router.post("/admin/categorias", logger, requireAdmin, categoriasController.criarCategoria);
router.patch("/admin/categorias/:id", logger, requireAdmin, categoriasController.atualizarCategoria);
router.delete("/admin/categorias/:id", logger, requireAdmin, categoriasController.removerCategoria);

module.exports = router;
