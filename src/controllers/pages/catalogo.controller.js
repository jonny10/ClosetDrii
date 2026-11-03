const { Produto, Categoria, ProdutoVariante, Tamanho } = require("../../models");

// Páginas falam direto com os models; a camada de services fica para a API.
// A tabela é renderizada no servidor ({{#each}}); o catalogo.js só filtra no DOM
// e chama os endpoints de CRUD (reload + snackbar via sessionStorage após mutação).
async function renderCatalogo(req, res, next) {
    try {
        const [produtos, categorias, tamanhos] = await Promise.all([
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
            Categoria.findAll({ order: [["nome", "ASC"]], attributes: ["id", "nome", "descricao"] }),
            Tamanho.findAll({ order: [["ordem", "ASC"], ["nome", "ASC"]] }),
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

        // --- KPIs de estoque (calculados da lista já carregada — zero queries extras) ---
        const pecasDe = (p) => p.variantes.reduce((acc, v) => acc + v.estoque, 0);

        const totalPecas = lista.reduce((acc, p) => acc + pecasDe(p), 0);
        const totalVariantes = lista.reduce((acc, p) => acc + p.variantes.length, 0);
        const precoMedio = lista.length > 0
            ? lista.reduce((acc, p) => acc + p.preco, 0) / lista.length
            : 0;

        const kpis = {
            totalProdutos: lista.length,
            totalVariantes,
            totalPecas,
            precoMedio: precoMedio.toFixed(2).replace(".", ","),
        };

        // estoque por categoria, ordenado por peças (maior primeiro)
        const porCategoria = {};
        lista.forEach((p) => {
            const nome = p.categoria || "Sem categoria";
            porCategoria[nome] = porCategoria[nome] || { looks: 0, pecas: 0 };
            porCategoria[nome].looks += 1;
            porCategoria[nome].pecas += pecasDe(p);
        });
        const estoquePorCategoria = Object.entries(porCategoria)
            .map(([nome, dados]) => ({ nome, ...dados }))
            .sort((a, b) => b.pecas - a.pecas);

        // variantes com 3 peças ou menos — alerta de reposição
        const alertas = [];
        lista.forEach((p) => {
            p.variantes.forEach((v) => {
                if (v.estoque <= 3) {
                    alertas.push({ produto: p.nome, cor: v.cor, tamanho: v.tamanho, estoque: v.estoque });
                }
            });
        });

        // quantas variantes usam cada sigla (mostrado no modal de tamanhos)
        const usosPorTamanho = {};
        lista.forEach((p) =>
            p.variantes.forEach((v) => {
                usosPorTamanho[v.tamanho] = (usosPorTamanho[v.tamanho] || 0) + 1;
            }),
        );

        res.render("pages/catalogo", {
            title: "Closet Drii | Catálogo",
            pageStyle: "catalogo",   // carrega /css/catalogo.css
            pageScript: "catalogo",  // carrega /js/catalogo.js
            produtos: lista,
            categorias: categorias.map((c) => ({
                id: c.id,
                nome: c.nome,
                descricao: c.descricao,
                looks: lista.filter((p) => p.categoria_id === c.id).length,
            })),
            tamanhos: tamanhos.map((t) => ({
                id: t.id,
                nome: t.nome,
                ordem: t.ordem,
                variantes: usosPorTamanho[t.nome] || 0,
            })),
            kpis,
            estoquePorCategoria,
            alertas,
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = renderCatalogo;
