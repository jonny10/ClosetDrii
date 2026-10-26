const { Avaliacao, Usuario, Produto } = require("../models");

// Campos aceitos em criar/atualizar
const CAMPOS = ["usuario_id", "produto_id", "nota", "comentario"];

// Monta o objeto só com os campos permitidos que vieram definidos
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte a instância do Sequelize no shape que a API devolve.
// usuario/produto só aparecem quando a associação foi carregada (include).
function formatarAvaliacao(avaliacao) {
    return {
        id: avaliacao.id,
        usuario_id: avaliacao.usuario_id,
        produto_id: avaliacao.produto_id,
        nota: avaliacao.nota,
        comentario: avaliacao.comentario,
        usuario: avaliacao.usuario
            ? { id: avaliacao.usuario.id, nome: avaliacao.usuario.nome }
            : undefined,
        produto: avaliacao.produto
            ? { id: avaliacao.produto.id, nome: avaliacao.produto.nome }
            : undefined,
    };
}

// GET /api/avaliacoes — lista; filtro opcional por produto
async function listarAvaliacoes({ produtoId } = {}) {
    const where = {};
    if (produtoId) where.produto_id = produtoId;

    const avaliacoes = await Avaliacao.findAll({
        where,
        include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome"] }],
        order: [["id", "DESC"]],
    });
    return avaliacoes.map(formatarAvaliacao);
}

// GET /api/avaliacoes/:id — detalhe; null se não existir
async function buscarAvaliacao(id) {
    const avaliacao = await Avaliacao.findByPk(id, {
        include: [
            { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
            { model: Produto, as: "produto", attributes: ["id", "nome"] },
        ],
    });
    return avaliacao ? formatarAvaliacao(avaliacao) : null;
}

// POST /api/avaliacoes
async function criarAvaliacao(dados) {
    const avaliacao = await Avaliacao.create(montarDados(dados));
    return formatarAvaliacao(avaliacao);
}

// PUT/PATCH /api/avaliacoes/:id — null se não existir
async function atualizarAvaliacao(id, dados) {
    const avaliacao = await Avaliacao.findByPk(id);
    if (!avaliacao) return null;

    await avaliacao.update(montarDados(dados));
    return formatarAvaliacao(avaliacao);
}

// DELETE /api/avaliacoes/:id — false se não existir
async function removerAvaliacao(id) {
    const avaliacao = await Avaliacao.findByPk(id);
    if (!avaliacao) return false;

    await avaliacao.destroy();
    return true;
}

module.exports = {
    listarAvaliacoes,
    buscarAvaliacao,
    criarAvaliacao,
    atualizarAvaliacao,
    removerAvaliacao,
    formatarAvaliacao,
};
