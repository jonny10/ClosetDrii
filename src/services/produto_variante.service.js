const { ProdutoVariante } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment
const CAMPOS = ["produto_id", "cor", "tamanho", "imagem_url", "estoque"];

// Monta o objeto só com os campos permitidos que vieram definidos (serve p/ create e update parcial)
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte a instância do Sequelize no shape que a API devolve
function formatarVariante(variante) {
    return {
        id: variante.id,
        produto_id: variante.produto_id,
        cor: variante.cor,
        tamanho: variante.tamanho,
        imagem_url: variante.imagem_url,
        estoque: variante.estoque,
    };
}

// GET /api/variantes — lista; filtro opcional por produto
async function listarVariantes({ produtoId } = {}) {
    const where = {};
    if (produtoId) where.produto_id = produtoId;

    const variantes = await ProdutoVariante.findAll({ where, order: [["id", "ASC"]] });
    return variantes.map(formatarVariante);
}

// GET /api/variantes/:id — detalhe; null se não existir
async function buscarVariante(id) {
    const variante = await ProdutoVariante.findByPk(id);
    return variante ? formatarVariante(variante) : null;
}

// POST /api/variantes
async function criarVariante(dados) {
    const variante = await ProdutoVariante.create(montarDados(dados));
    return formatarVariante(variante);
}

// PUT/PATCH /api/variantes/:id — null se não existir
async function atualizarVariante(id, dados) {
    const variante = await ProdutoVariante.findByPk(id);
    if (!variante) return null;

    await variante.update(montarDados(dados));
    return formatarVariante(variante);
}

// DELETE /api/variantes/:id — false se não existir
async function removerVariante(id) {
    const variante = await ProdutoVariante.findByPk(id);
    if (!variante) return false;

    await variante.destroy();
    return true;
}

module.exports = {
    listarVariantes,
    buscarVariante,
    criarVariante,
    atualizarVariante,
    removerVariante,
    formatarVariante,
};
