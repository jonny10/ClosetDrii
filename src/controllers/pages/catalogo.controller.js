const { Produto, Categoria, ProdutoVariante } = require("../../models");

// Páginas falam direto com os models; a camada de services fica para a API.
// A tabela é renderizada no servidor ({{#each}}); o catalogo.js só filtra no DOM
// e chama os endpoints de CRUD (reload + snackbar via sessionStorage após mutação).
async function renderCatalogo(req, res, next) {
    try {
        const [produtos, categorias] = await Promise.all([
            Produto.findAll({
                include: [
                    { model: Categoria, as: "categoria", attributes: ["id", "nome"] },
                    {
                        model: ProdutoVariante,
                        as: "variantes",
                        attributes: ["id", "cor", "tamanho", "estoque", "imagem_url"],
                    },
                ],
                order: [["created_at", "DESC"]],
            }),
            Categoria.findAll({ order: [["nome", "ASC"]], attributes: ["id", "nome"] }),
        ]);

        // converte as instâncias em objetos simples e formata o que a view precisa
        const lista = produtos.map((p) => ({
            id: p.id,
            id_formatado: String(p.id).padStart(3, "0"),
            nome: p.nome,
            descricao: p.descricao,
            preco: Number(p.preco),
            preco_formatado: Number(p.preco).toFixed(2).replace(".", ","),
            categoria: p.categoria ? p.categoria.nome : null,
            categoria_id: p.categoria ? p.categoria.id : null,
            busca: `${p.nome} ${p.descricao}`.toLowerCase(),
            variantes: (p.variantes || []).map((v) => ({
                id: v.id,
                cor: v.cor,
                tamanho: v.tamanho,
                estoque: v.estoque,
                imagem_url: v.imagem_url,
            })),
        }));

        res.render("pages/catalogo", {
            title: "Closet Drii | Catálogo",
            pageStyle: "catalogo",   // carrega /css/catalogo.css
            pageScript: "catalogo",  // carrega /js/catalogo.js
            produtos: lista,
            categorias: categorias.map((c) => ({ id: c.id, nome: c.nome })),
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = renderCatalogo;
