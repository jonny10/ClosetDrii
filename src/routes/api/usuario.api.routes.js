const express = require("express");
const router = express.Router();

const authController = require("../../controllers/api/usuario.api.controller");
const logger = require("../../middlewares/logger.middleware");

router.post("/auth/signup", logger, authController.cadastrar);
router.post("/auth/login", logger, authController.login);
router.post("/auth/logout", logger, authController.logout);

module.exports = router;
