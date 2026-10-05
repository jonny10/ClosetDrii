const express = require("express");
const router = express.Router();

const renderCart = require("../../controllers/pages/carrinho.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/cart", logger, renderCart);

module.exports = router;
