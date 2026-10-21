const express = require("express");
const router = express.Router();

const renderHistorico = require("../../controllers/pages/historico.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");

router.get("/historico", logger, requireAuth, renderHistorico);

module.exports = router;
