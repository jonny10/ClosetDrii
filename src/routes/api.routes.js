const express = require("express");
const router = express.Router();

const catalogController = require("../controllers/catalog.controller");
const logger = require("../middlewares/logger.middleware");

// Valida :id inteiro positivo nas rotas parametrizadas
function validarId(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "ID de produto inválido" });
    }
    next();
}

router.get("/produtos", logger, catalogController.listarProdutos);
router.get("/produtos/:id", logger, validarId, catalogController.buscarProdutoPorId);
router.get("/produtos/:id/variantes", logger, validarId, catalogController.listarVariantesDeProduto);
router.get("/categorias", logger, catalogController.listarCategorias);

module.exports = router;
