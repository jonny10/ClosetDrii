const createPageRenderer = require("./page-renderer");

module.exports = {
    renderLogin: createPageRenderer("login", "Login"),
    renderSignup: createPageRenderer("signup", "Cadastro"),
};