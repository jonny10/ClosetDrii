const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const logger = require("../middlewares/logger.middleware");

router.get("/vendas", logger, adminController.renderVendas);
router.get("/contact_adm", logger, adminController.renderContactAdm);

module.exports = router;