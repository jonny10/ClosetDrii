const produtoService = require("../../services/produto.service");

// GET /api/categorias — lista ordenada por nome
async function listarCategorias(req, res, next) {
    try {
        const categorias = await produtoService.listarCategorias();
        res.json(categorias);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listarCategorias,
};
