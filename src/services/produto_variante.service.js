const { Op } = require("sequelize");
const { ProdutoVariante, ProdutoVenda } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment
const CAMPOS = ["produto_id", "cor", "tamanho", "imagem_url", "estoque"];

function criarErro(mensagem, status) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

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

// POST /api/admin/produtos/:id/variantes — 409 se cor+tamanho já existirem no produto
async function criarVariante(dados) {
    const existente = await ProdutoVariante.findOne({
        where: { produto_id: dados.produto_id, cor: dados.cor, tamanho: dados.tamanho },
    });
    if (existente) throw criarErro("Variante já existe para este produto", 409);

    const variante = await ProdutoVariante.create(montarDados(dados));
    return formatarVariante(variante);
}

// PATCH /api/admin/variantes/:id — null se não existir; 409 se cor/tamanho
// colidirem com outra variante do mesmo produto
async function atualizarVariante(id, dados) {
    const variante = await ProdutoVariante.findByPk(id);
    if (!variante) return null;

    const patch = montarDados(dados);

    if (patch.cor !== undefined || patch.tamanho !== undefined) {
        const conflito = await ProdutoVariante.findOne({
            where: {
                produto_id: variante.produto_id,
                cor: patch.cor !== undefined ? patch.cor : variante.cor,
                tamanho: patch.tamanho !== undefined ? patch.tamanho : variante.tamanho,
                id: { [Op.ne]: id },
            },
        });
        if (conflito) throw criarErro("Variante já existe para este produto", 409);
    }

    await variante.update(patch);
    return formatarVariante(variante);
}

// DELETE /api/admin/variantes/:id — false se não existir; 409 com vendas vinculadas
async function removerVariante(id) {
    const variante = await ProdutoVariante.findByPk(id);
    if (!variante) return false;

    const vendas = await ProdutoVenda.count({ where: { produto_variante_id: id } });
    if (vendas > 0) throw criarErro("Variante possui vendas vinculadas", 409);

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
