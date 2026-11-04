const { Produto, Categoria, ProdutoVariante, Tamanho } = require("../../models");

// Páginas falam direto com os models; a camada de services fica para a API.
async function renderProdutos(req, res, next) {
    try {
        const [produtos, categorias, tamanhos] = await Promise.all([
            Produto.findAll({
                include: [
                    { model: Categoria, as: "categoria", attributes: ["id", "nome"] },
                    { model: ProdutoVariante, as: "variantes", attributes: ["tamanho_id", "imagem_url"], include: [{ model: Tamanho, as: "tamanho", attributes: ["id", "nome"] }] },
                ],
                order: [["created_at", "DESC"]],
            }),
            Categoria.findAll({ order: [["nome", "ASC"]], attributes: ["id", "nome"] }),
            Tamanho.findAll({ order: [["ordem", "ASC"]], attributes: ["id", "nome"] }),
        ]);

        // converte as instâncias em objetos simples e formata o que a view precisa.
        // Os cards são renderizados no servidor ({{#each}}); o JS do catálogo filtra
        // e ordena no DOM a partir dos data-attributes daqui.
        const lista = produtos.map((p) => {
            const tamanhos = [...new Set((p.variantes || []).map((v) => v.tamanho?.nome ?? null).filter(Boolean))];
            return {
                id: p.id,
                nome: p.nome,
                descricao: p.descricao,
                preco: Number(p.preco),
                preco_formatado: Number(p.preco).toFixed(2).replace(".", ","),
                categoria: p.categoria ? p.categoria.nome : null,
                tamanhos: tamanhos.join(","),
                busca: `${p.nome} ${p.descricao}`.toLowerCase(),
                // produtos ainda não têm coluna de imagem no model; as URLs antigas
                // (src/assets/...) morreram com o stack Firebase → placeholder igual à home
                imagem: "/assets/img/sala.png",
            };
        });

        res.render("pages/produtos", {
            title: "Closet Drii | Nossa Coleção",
            pageStyle: "produtos",   // carrega /css/produtos.css
            pageScript: "produtos",  // carrega /js/produtos.js
            produtos: lista,
            categorias: categorias.map((c) => ({
                id: c.id,
                nome: c.nome,
                nome_lower: c.nome.toLowerCase(),
            })),
            tamanhos: tamanhos.map((t) => ({ id: t.id, nome: t.nome })),
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = renderProdutos;
