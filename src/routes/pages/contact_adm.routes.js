const express = require("express");
const router = express.Router();

const renderContactAdm = require("../../controllers/pages/contato-adm.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/contact_adm", logger, renderContactAdm);

module.exports = router;
