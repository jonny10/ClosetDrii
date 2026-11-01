const express = require("express");
const router = express.Router();

const produtosController = require("../../controllers/api/produtos.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/produtos", logger, produtosController.listarProdutos);
router.get("/produtos/:id", logger, produtosController.buscarProduto);
router.get("/produtos/:id/variantes", logger, produtosController.listarVariantesDeProduto);

// Admin (CRUD de produtos e variantes)
router.post("/admin/produtos", logger, requireAdmin, produtosController.criarProduto);
router.patch("/admin/produtos/:id", logger, requireAdmin, produtosController.atualizarProduto);
router.delete("/admin/produtos/:id", logger, requireAdmin, produtosController.removerProduto);
router.post("/admin/produtos/:id/variantes", logger, requireAdmin, produtosController.criarVarianteDeProduto);
router.patch("/admin/variantes/:id", logger, requireAdmin, produtosController.atualizarVariante);
router.delete("/admin/variantes/:id", logger, requireAdmin, produtosController.removerVariante);

module.exports = router;
