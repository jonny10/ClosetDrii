const createPageRenderer = require("./page-renderer");

module.exports = {
    renderProfile: createPageRenderer("profile", "Perfil"),
    renderDados: createPageRenderer("dados", "Dados"),
    renderHistorico: createPageRenderer("historico", "Histórico"),
};