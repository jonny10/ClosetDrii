const createPageRenderer = require("./page-renderer");

module.exports = {
    renderProdutos: createPageRenderer("produtos", "Produtos"),
    renderCatalogo: createPageRenderer("catalogo", "Catálogo"),
};