const dashboardService = require("../../services/dashboard.service");

// GET /api/admin/dashboard — visão geral de vendas do admin (requireAdmin na rota).
async function metricasDashboard(req, res, next) {
    try {
        const metricas = await dashboardService.calcularMetricasDashboard();
        return res.json(metricas);
    } catch (err) {
        next(err);
    }
}

module.exports = { metricasDashboard };
