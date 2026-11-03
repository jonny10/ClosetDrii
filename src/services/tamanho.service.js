const { Op } = require("sequelize");
const { Tamanho, ProdutoVariante } = require("../models");

function criarErro(mensagem, status) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function formatarTamanho(tamanho) {
    return {
        id: tamanho.id,
        nome: tamanho.nome,
        ordem: tamanho.ordem,
    };
}

// GET /api/tamanhos — ordenado pela ordem de exibição
async function listarTamanhos() {
    const tamanhos = await Tamanho.findAll({ order: [["ordem", "ASC"], ["nome", "ASC"]] });
    return tamanhos.map(formatarTamanho);
}

// POST /api/admin/tamanhos — 409 se a sigla já existir
async function criarTamanho(dados) {
    const existente = await Tamanho.findOne({ where: { nome: dados.nome } });
    if (existente) throw criarErro("Tamanho já existe", 409);

    const tamanho = await Tamanho.create(dados);
    return formatarTamanho(tamanho);
}

// PATCH /api/admin/tamanhos/:id — null se não existir; 409 se a sigla colidir
async function atualizarTamanho(id, dados) {
    const tamanho = await Tamanho.findByPk(id);
    if (!tamanho) return null;

    if (dados.nome !== undefined) {
        const existente = await Tamanho.findOne({
            where: { nome: dados.nome, id: { [Op.ne]: id } },
        });
        if (existente) throw criarErro("Tamanho já existe", 409);
    }

    await tamanho.update(dados);
    return formatarTamanho(tamanho);
}

// DELETE /api/admin/tamanhos/:id — null se não existir; 409 se variantes usarem a sigla
async function removerTamanho(id) {
    const tamanho = await Tamanho.findByPk(id);
    if (!tamanho) return null;

    const emUso = await ProdutoVariante.count({ where: { tamanho: tamanho.nome } });
    if (emUso > 0) throw criarErro("Tamanho em uso por variantes", 409);

    await tamanho.destroy();
    return { id };
}

module.exports = {
    listarTamanhos,
    criarTamanho,
    atualizarTamanho,
    removerTamanho,
};
