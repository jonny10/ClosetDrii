const express = require("express");
const router = express.Router();

const renderHome = require("../controllers/site/home.controller");
const renderAbout = require("../controllers/site/sobre.controller");
const renderContact = require("../controllers/site/contato.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/", logger, renderHome);
router.get("/about", logger, renderAbout);
router.get("/contact", logger, renderContact);

module.exports = router;
