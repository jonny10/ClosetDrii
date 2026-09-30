async function renderCart(req, res, next) {
    try {
        res.render("pages/cart", {
            title: "Closet Drii | Carrinho",
            pageStyle: "cart",   // carrega /css/cart.css
            pageScript: "cart",  // carrega /js/cart.js
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = { renderCart };