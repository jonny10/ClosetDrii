const { Op } = require("sequelize");
const { Categoria, Produto } = require("../models");

function criarErro(mensagem, status) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function formatarCategoria(categoria) {
    return {
        id: categoria.id,
        nome: categoria.nome,
        descricao: categoria.descricao,
    };
}

// GET /api/categorias — lista ordenada por nome
async function listarCategorias() {
    const categorias = await Categoria.findAll({ order: [["nome", "ASC"]] });
    return categorias.map(formatarCategoria);
}

// GET /api/categorias/:id — detalhe; null se não existir
async function buscarCategoria(id) {
    const categoria = await Categoria.findByPk(id);
    return categoria ? formatarCategoria(categoria) : null;
}

// POST /api/admin/categorias — 409 se o nome já existir
async function criarCategoria(dados) {
    const existente = await Categoria.findOne({ where: { nome: dados.nome } });
    if (existente) throw criarErro("Categoria já existe", 409);

    const categoria = await Categoria.create(dados);
    return formatarCategoria(categoria);
}

// PATCH /api/admin/categorias/:id — null se não existir; 409 se o nome colidir com outra
async function atualizarCategoria(id, dados) {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) return null;

    if (dados.nome !== undefined) {
        const existente = await Categoria.findOne({
            where: { nome: dados.nome, id: { [Op.ne]: id } },
        });
        if (existente) throw criarErro("Categoria já existe", 409);
    }

    await categoria.update(dados);
    return formatarCategoria(categoria);
}

// DELETE /api/admin/categorias/:id — null se não existir; 409 com produtos vinculados
async function removerCategoria(id) {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) return null;

    const produtos = await Produto.count({ where: { categoria_id: id } });
    if (produtos > 0) throw criarErro("Categoria possui produtos vinculados", 409);

    await categoria.destroy();
    return { id };
}

module.exports = {
    listarCategorias,
    buscarCategoria,
    criarCategoria,
    atualizarCategoria,
    removerCategoria,
};
