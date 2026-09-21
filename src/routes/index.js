const express = require('express');
const router = express.Router();

const homeController = require("../controllers/home.controller");
const logger = require("../middlewares/logger.middleware");

// middleware → controller
router.get("/", logger, homeController.renderHome);

module.exports = router;
