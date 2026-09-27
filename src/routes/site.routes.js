const express = require("express");
const router = express.Router();

const homeController = require("../controllers/home.controller");
const siteController = require("../controllers/site.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/", logger, homeController.renderHome);
router.get("/about", logger, siteController.renderAbout);
router.get("/contact", logger, siteController.renderContact);

module.exports = router;