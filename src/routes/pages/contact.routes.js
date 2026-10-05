const express = require("express");
const router = express.Router();

const renderContact = require("../../controllers/pages/contato.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/contact", logger, renderContact);

module.exports = router;
