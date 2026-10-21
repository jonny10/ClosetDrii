const express = require("express");
const router = express.Router();

const renderVendas = require("../../controllers/pages/vendas.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/vendas", logger, requireAdmin, renderVendas);

module.exports = router;
