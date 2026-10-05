const express = require("express");
const router = express.Router();

const renderVendas = require("../../controllers/pages/vendas.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/vendas", logger, renderVendas);

module.exports = router;
