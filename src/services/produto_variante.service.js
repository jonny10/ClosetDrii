const { Op } = require("sequelize");
const { ProdutoVariante, ProdutoVenda, Tamanho } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment
const CAMPOS = ["produto_id", "cor", "tamanho_id", "imagem_url", "estoque"];

const INCLUDE_TAMANHO = { model: Tamanho, as: "tamanho", attributes: ["id", "nome"] };

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
        tamanho: variante.tamanho?.nome ?? null,
        imagem_url: variante.imagem_url,
        estoque: variante.estoque,
    };
}

// Resolve a sigla (ex: "P") para o id do tamanho; 400 se não existir
async function resolverTamanhoId(sigla) {
    const tamanho = await Tamanho.findOne({ where: { nome: sigla } });
    if (!tamanho) throw criarErro("Tamanho inválido", 400);
    return tamanho.id;
}

// GET /api/variantes — lista; filtro opcional por produto
async function listarVariantes({ produtoId } = {}) {
    const where = {};
    if (produtoId) where.produto_id = produtoId;

    const variantes = await ProdutoVariante.findAll({
        where,
        include: [INCLUDE_TAMANHO],
        order: [["id", "ASC"]],
    });
    return variantes.map(formatarVariante);
}

// GET /api/variantes/:id — detalhe; null se não existir
async function buscarVariante(id) {
    const variante = await ProdutoVariante.findByPk(id, {
        include: [INCLUDE_TAMANHO],
    });
    return variante ? formatarVariante(variante) : null;
}

// POST /api/admin/produtos/:id/variantes — 409 se cor+tamanho já existirem no produto
async function criarVariante(dados) {
    // O controller passa `tamanho` como sigla textual — resolve para tamanho_id
    if (dados.tamanho !== undefined) {
        dados.tamanho_id = await resolverTamanhoId(dados.tamanho);
        delete dados.tamanho;
    }

    const existente = await ProdutoVariante.findOne({
        where: { produto_id: dados.produto_id, cor: dados.cor, tamanho_id: dados.tamanho_id },
    });
    if (existente) throw criarErro("Variante já existe para este produto", 409);

    const variante = await ProdutoVariante.create(montarDados(dados));
    // Reload with include to get the tamanho association
    const completa = await ProdutoVariante.findByPk(variante.id, { include: [INCLUDE_TAMANHO] });
    return formatarVariante(completa);
}

// PATCH /api/admin/variantes/:id — null se não existir; 409 se cor/tamanho
// colidirem com outra variante do mesmo produto
async function atualizarVariante(id, dados) {
    const variante = await ProdutoVariante.findByPk(id);
    if (!variante) return null;

    // O controller passa `tamanho` como sigla textual — resolve para tamanho_id
    if (dados.tamanho !== undefined) {
        dados.tamanho_id = await resolverTamanhoId(dados.tamanho);
        delete dados.tamanho;
    }

    const patch = montarDados(dados);

    if (patch.cor !== undefined || patch.tamanho_id !== undefined) {
        const conflito = await ProdutoVariante.findOne({
            where: {
                produto_id: variante.produto_id,
                cor: patch.cor !== undefined ? patch.cor : variante.cor,
                tamanho_id: patch.tamanho_id !== undefined ? patch.tamanho_id : variante.tamanho_id,
                id: { [Op.ne]: id },
            },
        });
        if (conflito) throw criarErro("Variante já existe para este produto", 409);
    }

    await variante.update(patch);
    // Reload with include to get the tamanho association
    const completa = await ProdutoVariante.findByPk(id, { include: [INCLUDE_TAMANHO] });
    return formatarVariante(completa);
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
