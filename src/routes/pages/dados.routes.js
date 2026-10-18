const express = require("express");
const router = express.Router();

const renderDados = require("../../controllers/pages/dados.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");

router.get("/dados", logger, requireAuth, renderDados);

module.exports = router;
