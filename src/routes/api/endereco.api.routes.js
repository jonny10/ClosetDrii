const express = require("express");
const router = express.Router();

const enderecosController = require("../../controllers/api/enderecos.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");

router.get("/enderecos", logger, requireAuth, enderecosController.listar);
router.post("/enderecos", logger, requireAuth, enderecosController.criar);

module.exports = router;
