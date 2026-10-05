const { Op } = require("sequelize");
const { Produto, Categoria, ProdutoVariante } = require("../models");

const INCLUDE_CATEGORIA = {
    model: Categoria,
    as: "categoria",
    attributes: ["id", "nome"],
};

const INCLUDE_VARIANTES = {
    model: ProdutoVariante,
    as: "variantes",
    attributes: ["id", "cor", "tamanho", "estoque", "imagem_url"],
};

// Converte a instância do Sequelize (com associações) no shape que a API devolve.
// preco sai como Number — a formatação pt-BR é responsabilidade da camada de view.
function formatarProduto(produto) {
    return {
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: Number(produto.preco),
        categoria: produto.categoria
            ? { id: produto.categoria.id, nome: produto.categoria.nome }
            : null,
        variantes: (produto.variantes || []).map((v) => ({
            id: v.id,
            cor: v.cor,
            tamanho: v.tamanho,
            estoque: v.estoque,
            imagem_url: v.imagem_url,
        })),
    };
}

// GET /api/produtos — listagem com filtros de catálogo
// Query params: categoria (nome exato), busca (nome do produto), orderBy (preco|nome), dir (asc|desc)
async function listarProdutos({ categoria, busca, orderBy, dir } = {}) {
    const where = {};
    const include = [INCLUDE_CATEGORIA, INCLUDE_VARIANTES];

    if (busca) {
        where.nome = { [Op.like]: `%${busca}%` };
    }

    if (categoria) {
        // where dentro do include vira INNER JOIN — filtra pela categoria de nome exato
        include[0] = { ...INCLUDE_CATEGORIA, where: { nome: categoria } };
    }

    let order = [["created_at", "DESC"]];
    if (orderBy === "preco" || orderBy === "nome") {
        order = [[orderBy, dir === "desc" ? "DESC" : "ASC"]];
    }

    const produtos = await Produto.findAll({ where, include, order });
    return produtos.map(formatarProduto);
}

// GET /api/produtos/:id
async function buscarProduto(id) {
    return Produto.findByPk(id, {
        include: [INCLUDE_CATEGORIA, INCLUDE_VARIANTES],
    });
}

// GET /api/produtos/:id/variantes
async function listarVariantes(produtoId) {
    const variantes = await ProdutoVariante.findAll({
        where: { produto_id: produtoId },
        order: [["id", "ASC"]],
    });

    return variantes.map((v) => ({
        id: v.id,
        cor: v.cor,
        tamanho: v.tamanho,
        estoque: v.estoque,
        imagem_url: v.imagem_url,
    }));
}

// GET /api/categorias
async function listarCategorias() {
    const categorias = await Categoria.findAll({ order: [["nome", "ASC"]] });
    return categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
    }));
}

module.exports = {
    listarProdutos,
    buscarProduto,
    listarVariantes,
    listarCategorias,
    formatarProduto,
};
