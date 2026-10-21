const { Categoria } = require("../models");

// GET /api/categorias — lista ordenada por nome
async function listarCategorias() {
    const categorias = await Categoria.findAll({ order: [["nome", "ASC"]] });
    return categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
    }));
}

// GET /api/categorias/:id — detalhe; null se não existir
async function buscarCategoria(id) {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
        return null;
    }
    return {
        id: categoria.id,
        nome: categoria.nome,
        descricao: categoria.descricao,
    };
}

module.exports = {
    listarCategorias,
    buscarCategoria,
};
