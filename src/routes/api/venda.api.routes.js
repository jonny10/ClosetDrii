const express = require("express");
const router = express.Router();

const vendasController = require("../../controllers/api/vendas.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");
const uploadComprovante = require("../../middlewares/upload-comprovante.middleware");

// Cliente
router.post("/vendas", logger, requireAuth, vendasController.fecharPedido);
router.get("/vendas/minhas", logger, requireAuth, vendasController.listarMinhas);

// Admin (painel de vendas)
router.get("/admin/vendas", logger, requireAdmin, vendasController.listarTodas);
router.patch("/admin/vendas/:id/status", logger, requireAdmin, vendasController.atualizarStatus);
router.post(
    "/admin/vendas/:id/comprovante",
    logger,
    requireAdmin,
    uploadComprovante,
    vendasController.vincularComprovante
);
router.delete(
    "/admin/vendas/:id/comprovante",
    logger,
    requireAdmin,
    vendasController.removerComprovante
);

module.exports = router;
