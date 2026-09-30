const express = require("express");
const router = express.Router();

const catalogController = require("../controllers/catalog.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/produtos", logger, catalogController.renderProdutos);
router.get("/catalogo", logger, catalogController.renderCatalogo);

module.exports = router;