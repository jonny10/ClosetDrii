const { Produto, Categoria } = require("../models");

async function getDadosHome() {
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

    return { destaques, ofertas };
}

module.exports = { getDadosHome };
