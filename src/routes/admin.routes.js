const express = require("express");
const router = express.Router();

const renderVendas = require("../controllers/admin/vendas.controller");
const renderContactAdm = require("../controllers/admin/contato.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/vendas", logger, renderVendas);
router.get("/contact_adm", logger, renderContactAdm);

module.exports = router;
