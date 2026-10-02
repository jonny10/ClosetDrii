const express = require("express");
const router = express.Router();

const renderProfile = require("../controllers/account/perfil.controller");
const renderHistorico = require("../controllers/account/historico.controller");
const renderDados = require("../controllers/account/dados.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/profile", logger, renderProfile);
router.get("/historico", logger, renderHistorico);
router.get("/dados", logger, renderDados);

module.exports = router;
