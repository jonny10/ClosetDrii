const express = require("express");
const router = express.Router();

const renderLogin = require("../../controllers/pages/login.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/login", logger, renderLogin);

module.exports = router;
