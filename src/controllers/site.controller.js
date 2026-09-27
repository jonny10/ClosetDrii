const createPageRenderer = require("./page-renderer");

module.exports = {
    renderAbout: createPageRenderer("about", "Sobre"),
    renderContact: createPageRenderer("contact", "Contato"),
};