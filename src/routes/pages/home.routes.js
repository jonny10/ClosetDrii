const express = require("express");
const router = express.Router();

const renderHome = require("../../controllers/pages/home.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/", logger, renderHome);

module.exports = router;
