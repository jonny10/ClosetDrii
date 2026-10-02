const express = require("express");
const router = express.Router();

const renderProdutos = require("../controllers/catalog/produtos.controller");
const renderCatalogo = require("../controllers/catalog/catalogo.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/produtos", logger, renderProdutos);
router.get("/catalogo", logger, renderCatalogo);

module.exports = router;
