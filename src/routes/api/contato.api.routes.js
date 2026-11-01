const express = require("express");
const router = express.Router();

const contatosController = require("../../controllers/api/contatos.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

// Público: formulário de contato do site
router.post("/contatos", logger, contatosController.criarContato);

// Admin: painel de mensagens de contato
router.get("/admin/contatos", logger, requireAdmin, contatosController.listarMensagens);
router.patch("/admin/contatos/:id", logger, requireAdmin, contatosController.marcarRespondida);

module.exports = router;
