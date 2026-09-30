const createPageRenderer = require("./page-renderer");

module.exports = {
    renderVendas: createPageRenderer("vendas", "Vendas"),
    renderContactAdm: createPageRenderer("contact_adm", "Contato Admin"),
};