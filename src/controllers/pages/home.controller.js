const { Produto, Categoria } = require("../../models");

// Páginas falam direto com os models; a camada de services fica para a API.
async function renderHome(req, res, next) {
    try {
        const produtos = await Produto.findAll({
            include: { model: Categoria, as: "categoria", attributes: ["id", "nome"] },
            order: [["created_at", "DESC"]],
            limit: 8,
        });

        // converte a instância do Sequelize em objeto simples e formata o que a view precisa
        const lista = produtos.map((p) => ({
            id: p.id,
            nome: p.nome,
            preco: Number(p.preco).toFixed(2).replace(".", ","), // 129.90 -> "129,90"
            categoria: p.categoria ? p.categoria.nome : null,
            imagem: "/assets/img/sala.png", // produtos ainda não tem coluna de imagem
        }));

        // o banco não tem flag de "destaque"/"oferta"; por ora separo por fatia
        const destaques = lista.slice(0, 4);
        const ofertas = lista.slice(4, 8);

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

module.exports = renderHome;
