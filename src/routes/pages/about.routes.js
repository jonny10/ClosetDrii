const express = require("express");
const router = express.Router();

const renderAbout = require("../../controllers/pages/sobre.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/about", logger, renderAbout);

module.exports = router;
