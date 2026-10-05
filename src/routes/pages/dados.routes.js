const express = require("express");
const router = express.Router();

const renderDados = require("../../controllers/pages/dados.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/dados", logger, renderDados);

module.exports = router;
