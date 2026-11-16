const express = require("express");
const router = express.Router();

const renderDados = require("../../controllers/pages/dados.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/dados", logger, requireAdmin, renderDados);

module.exports = router;
