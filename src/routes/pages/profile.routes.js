const express = require("express");
const router = express.Router();

const renderProfile = require("../../controllers/pages/perfil.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAuth = require("../../middlewares/require-auth.middleware");

router.get("/profile", logger, requireAuth, renderProfile);

module.exports = router;
