const express = require("express");
const router = express.Router();

const dashboardController = require("../../controllers/api/dashboard.api.controller");
const logger = require("../../middlewares/logger.middleware");
const requireAdmin = require("../../middlewares/require-admin.middleware");

router.get("/admin/dashboard", logger, requireAdmin, dashboardController.metricasDashboard);

module.exports = router;
