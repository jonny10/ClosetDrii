const express = require("express");
const router = express.Router();

const vendasController = require("../../controllers/api/vendas.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");
const uploadComprovante = require("../../middlewares/upload-comprovante.middleware");

router.post("/vendas", logger, requireAuth, vendasController.fecharPedido);
router.get("/vendas/minhas", logger, requireAuth, vendasController.listarMinhas);
router.post(
    "/vendas/:id/comprovante",
    logger,
    requireAuth,
    uploadComprovante,
    vendasController.vincularComprovante
);

module.exports = router;
