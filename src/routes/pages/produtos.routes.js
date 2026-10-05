const express = require("express");
const router = express.Router();

const renderProdutos = require("../../controllers/pages/produtos.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/produtos", logger, renderProdutos);

module.exports = router;
