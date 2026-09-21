const homeService = require("../services/home.service");

async function renderHome(req, res, next) {
    try {
        const { destaques, ofertas } = await homeService.getDadosHome();

        res.render("pages/home", {
            title: "Closet Drii | Moda Feminina",
            pageStyle: "home",   // carrega /css/home.css
            pageScript: "home",  // carrega /js/home.js
            destaques,
            ofertas,
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = { renderHome };
