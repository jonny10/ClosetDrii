const categoriaService = require("../../services/categoria.service");

// GET /api/categorias — lista ordenada por nome
async function listarCategorias(req, res, next) {
    try {
        const categorias = await categoriaService.listarCategorias();
        res.json(categorias);
    } catch (err) {
        next(err);
    }
}

// GET /api/categorias/:id — detalhe; 404 JSON se não existir
async function buscarCategoria(req, res, next) {
    try {
        const categoria = await categoriaService.buscarCategoria(Number(req.params.id));
        if (!categoria) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }
        res.json(categoria);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listarCategorias,
    buscarCategoria,
};
