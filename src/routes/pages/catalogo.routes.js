const express = require("express");
const router = express.Router();

const renderCatalogo = require("../../controllers/pages/catalogo.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/catalogo", logger, requireAdmin, renderCatalogo);

module.exports = router;
