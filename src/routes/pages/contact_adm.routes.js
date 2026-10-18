const express = require("express");
const router = express.Router();

const renderContactAdm = require("../../controllers/pages/contato-adm.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/contact_adm", logger, requireAdmin, renderContactAdm);

module.exports = router;
