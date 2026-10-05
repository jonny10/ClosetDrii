const express = require("express");
const router = express.Router();

const renderProfile = require("../../controllers/pages/perfil.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/profile", logger, renderProfile);

module.exports = router;
