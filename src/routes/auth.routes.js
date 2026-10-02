const express = require("express");
const router = express.Router();

const renderSignup = require("../controllers/auth/cadastro.controller");
const renderLogin = require("../controllers/auth/login.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/signup", logger, renderSignup);
router.get("/login", logger, renderLogin);

module.exports = router;
