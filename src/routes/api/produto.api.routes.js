const express = require("express");
const router = express.Router();

const produtosController = require("../../controllers/api/produtos.api.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/produtos", logger, produtosController.listarProdutos);
router.get("/produtos/:id", logger, produtosController.buscarProduto);
router.get("/produtos/:id/variantes", logger, produtosController.listarVariantesDeProduto);

module.exports = router;
