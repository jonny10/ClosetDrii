const express = require("express");
const router = express.Router();

const accountController = require("../controllers/account.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/profile", logger, accountController.renderProfile);
router.get("/historico", logger, accountController.renderHistorico);
router.get("/dados", logger, accountController.renderDados);

module.exports = router;