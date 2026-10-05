const express = require("express");
const router = express.Router();

const renderSignup = require("../../controllers/pages/cadastro.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/signup", logger, renderSignup);

module.exports = router;
