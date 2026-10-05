const produtoService = require("../../services/produto.service");

// GET /api/produtos — filtros: categoria (nome exato), busca (nome), orderBy (preco|nome), dir (asc|desc)
async function listarProdutos(req, res, next) {
    try {
        const produtos = await produtoService.listarProdutos({
            categoria: req.query.categoria,
            busca: req.query.busca,
            orderBy: req.query.orderBy,
            dir: req.query.dir,
        });
        res.json(produtos);
    } catch (err) {
        next(err);
    }
}

// GET /api/produtos/:id — detalhe com categoria e variantes
async function buscarProduto(req, res, next) {
    try {
        const produto = await produtoService.buscarProduto(Number(req.params.id));
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        res.json(produtoService.formatarProduto(produto));
    } catch (err) {
        next(err);
    }
}

// GET /api/produtos/:id/variantes — só as variantes; 404 se o produto não existir
async function listarVariantesDeProduto(req, res, next) {
    try {
        const id = Number(req.params.id);
        const produto = await produtoService.buscarProduto(id);
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        const variantes = await produtoService.listarVariantes(id);
        res.json(variantes);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listarProdutos,
    buscarProduto,
    listarVariantesDeProduto,
};
