const express = require("express");
const router = express.Router();

const renderHistorico = require("../../controllers/pages/historico.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/historico", logger, renderHistorico);

module.exports = router;
