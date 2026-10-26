const { Endereco } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment (ex.: id, usuario_id forjado)
const CAMPOS = ["usuario_id", "rua", "numero", "bairro", "cidade", "estado", "cep", "complemento"];

// Monta o objeto só com os campos permitidos que vieram definidos (serve p/ create e update parcial)
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte a instância do Sequelize no shape que a API devolve
function formatarEndereco(endereco) {
    return {
        id: endereco.id,
        usuario_id: endereco.usuario_id,
        rua: endereco.rua,
        numero: endereco.numero,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        cep: endereco.cep,
        complemento: endereco.complemento,
    };
}

// GET /api/enderecos — lista; filtro opcional por usuário
async function listarEnderecos({ usuarioId } = {}) {
    const where = {};
    if (usuarioId) where.usuario_id = usuarioId;

    const enderecos = await Endereco.findAll({ where, order: [["id", "ASC"]] });
    return enderecos.map(formatarEndereco);
}

// GET /api/enderecos/:id — detalhe; null se não existir
async function buscarEndereco(id) {
    const endereco = await Endereco.findByPk(id);
    return endereco ? formatarEndereco(endereco) : null;
}

// POST /api/enderecos
async function criarEndereco(dados) {
    const endereco = await Endereco.create(montarDados(dados));
    return formatarEndereco(endereco);
}

// PUT/PATCH /api/enderecos/:id — null se não existir
async function atualizarEndereco(id, dados) {
    const endereco = await Endereco.findByPk(id);
    if (!endereco) return null;

    await endereco.update(montarDados(dados));
    return formatarEndereco(endereco);
}

// DELETE /api/enderecos/:id — soft delete (model paranoid); false se não existir
async function removerEndereco(id) {
    const endereco = await Endereco.findByPk(id);
    if (!endereco) return false;

    await endereco.destroy();
    return true;
}

module.exports = {
    listarEnderecos,
    buscarEndereco,
    criarEndereco,
    atualizarEndereco,
    removerEndereco,
    formatarEndereco,
};
