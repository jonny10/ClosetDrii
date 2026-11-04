const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Produto, Categoria, ProdutoVariante, ProdutoVenda, Avaliacao, Tamanho } = require("../models");

const INCLUDE_CATEGORIA = {
    model: Categoria,
    as: "categoria",
    attributes: ["id", "nome"],
};

const INCLUDE_TAMANHO = {
    model: Tamanho,
    as: "tamanho",
    attributes: ["id", "nome"],
};

const INCLUDE_VARIANTES = {
    model: ProdutoVariante,
    as: "variantes",
    attributes: ["id", "cor", "tamanho_id", "estoque", "imagem_url"],
    include: [INCLUDE_TAMANHO],
};

function criarErro(mensagem, status) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

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
            tamanho: v.tamanho?.nome ?? null,
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
        include: [INCLUDE_TAMANHO],
        order: [["id", "ASC"]],
    });

    return variantes.map((v) => ({
        id: v.id,
        cor: v.cor,
        tamanho: v.tamanho?.nome ?? null,
        estoque: v.estoque,
        imagem_url: v.imagem_url,
    }));
}

// POST /api/admin/produtos — produto + variantes opcionais numa única transação.
// 400 se a categoria não existir (a validação de campos fica no controller).
async function criarProdutoComVariantes(dados, variantes = []) {
    const categoria = await Categoria.findByPk(dados.categoria_id);
    if (!categoria) throw criarErro("Categoria não encontrada", 400);

    // Resolve cada sigla textual para o tamanho_id correspondente
    let tamanhoMap = new Map();
    if (variantes.length > 0) {
        const siglas = [...new Set(variantes.map((v) => v.tamanho))];
        const existentes = await Tamanho.findAll({ where: { nome: siglas }, attributes: ["id", "nome"] });
        if (existentes.length !== siglas.length) throw criarErro("Tamanho inválido", 400);
        tamanhoMap = new Map(existentes.map((t) => [t.nome, t.id]));
    }

    const produto = await sequelize.transaction(async (t) => {
        const novo = await Produto.create(dados, { transaction: t });

        if (variantes.length > 0) {
            await ProdutoVariante.bulkCreate(
                variantes.map((v) => ({
                    produto_id: novo.id,
                    cor: v.cor,
                    tamanho_id: tamanhoMap.get(v.tamanho),
                    estoque: v.estoque,
                    imagem_url: v.imagem_url,
                })),
                { transaction: t }
            );
        }

        return novo;
    });

    return formatarProduto(await buscarProduto(produto.id));
}

// PATCH /api/admin/produtos/:id — update parcial; null se não existir
async function atualizarProduto(id, dados) {
    const produto = await Produto.findByPk(id);
    if (!produto) return null;

    if (dados.categoria_id !== undefined) {
        const categoria = await Categoria.findByPk(dados.categoria_id);
        if (!categoria) throw criarErro("Categoria não encontrada", 400);
    }

    await produto.update(dados);
    return formatarProduto(await buscarProduto(id));
}

// DELETE /api/admin/produtos/:id — null se não existir; 409 se houver avaliações
// ou vendas vinculadas; remove produto + variantes em transação
async function removerProduto(id) {
    const produto = await Produto.findByPk(id);
    if (!produto) return null;

    const avaliacoes = await Avaliacao.count({ where: { produto_id: id } });
    if (avaliacoes > 0) throw criarErro("Produto possui avaliações vinculadas", 409);

    const variantes = await ProdutoVariante.findAll({
        where: { produto_id: id },
        attributes: ["id"],
    });
    if (variantes.length > 0) {
        const vendas = await ProdutoVenda.count({
            where: { produto_variante_id: variantes.map((v) => v.id) },
        });
        if (vendas > 0) throw criarErro("Produto possui vendas vinculadas", 409);
    }

    await sequelize.transaction(async (t) => {
        await ProdutoVariante.destroy({ where: { produto_id: id }, transaction: t });
        await produto.destroy({ transaction: t });
    });

    return { id };
}

module.exports = {
    listarProdutos,
    buscarProduto,
    listarVariantes,
    criarProdutoComVariantes,
    atualizarProduto,
    removerProduto,
    formatarProduto,
};
