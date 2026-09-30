const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cart.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/cart", logger, cartController.renderCart);

module.exports = router;