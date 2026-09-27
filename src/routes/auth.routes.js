const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/signup", logger, authController.renderSignup);
router.get("/login", logger, authController.renderLogin);

module.exports = router;