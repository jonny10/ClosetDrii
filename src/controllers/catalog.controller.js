const createPageRenderer = require("./page-renderer");
const catalogService = require("../services/catalog.service");

module.exports = {
    renderProdutos: createPageRenderer("produtos", "Produtos"),
    renderCatalogo: createPageRenderer("catalogo", "Catálogo"),

    async listarProdutos(req, res, next) {
        try {
            const produtos = await catalogService.listarProdutos({
                categoria: req.query.categoria,
                busca: req.query.busca,
                orderBy: req.query.orderBy,
                dir: req.query.dir,
            });
            res.json(produtos);
        } catch (err) {
            next(err);
        }
    },

    async buscarProdutoPorId(req, res, next) {
        try {
            const produto = await catalogService.buscarProduto(Number(req.params.id));
            if (!produto) {
                return res.status(404).json({ error: "Produto não encontrado" });
            }
            res.json(catalogService.formatarProduto(produto));
        } catch (err) {
            next(err);
        }
    },

    async listarCategorias(req, res, next) {
        try {
            const categorias = await catalogService.listarCategorias();
            res.json(categorias);
        } catch (err) {
            next(err);
        }
    },

    async listarVariantesDeProduto(req, res, next) {
        try {
            const id = Number(req.params.id);
            const produto = await catalogService.buscarProduto(id);
            if (!produto) {
                return res.status(404).json({ error: "Produto não encontrado" });
            }
            const variantes = await catalogService.listarVariantes(id);
            res.json(variantes);
        } catch (err) {
            next(err);
        }
    },
};
