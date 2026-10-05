const express = require("express");
const router = express.Router();

const renderCatalogo = require("../../controllers/pages/catalogo.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/catalogo", logger, renderCatalogo);

module.exports = router;
