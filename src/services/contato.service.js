const { Contato } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment
const CAMPOS = ["nome", "email", "assunto", "mensagem"];

// Monta o objeto só com os campos permitidos que vieram definidos (serve p/ create e update parcial)
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte a instância do Sequelize no shape que a API devolve
function formatarContato(contato) {
    return {
        id: contato.id,
        nome: contato.nome,
        email: contato.email,
        assunto: contato.assunto,
        mensagem: contato.mensagem,
        created_at: contato.created_at,
    };
}

// GET /api/contatos — mensagens do formulário, mais recentes primeiro
async function listarContatos() {
    const contatos = await Contato.findAll({ order: [["created_at", "DESC"]] });
    return contatos.map(formatarContato);
}

// GET /api/contatos/:id — detalhe; null se não existir
async function buscarContato(id) {
    const contato = await Contato.findByPk(id);
    return contato ? formatarContato(contato) : null;
}

// POST /api/contatos — envio do formulário de contato
async function criarContato(dados) {
    const contato = await Contato.create(montarDados(dados));
    return formatarContato(contato);
}

// PUT/PATCH /api/contatos/:id — null se não existir
async function atualizarContato(id, dados) {
    const contato = await Contato.findByPk(id);
    if (!contato) return null;

    await contato.update(montarDados(dados));
    return formatarContato(contato);
}

// DELETE /api/contatos/:id — false se não existir
async function removerContato(id) {
    const contato = await Contato.findByPk(id);
    if (!contato) return false;

    await contato.destroy();
    return true;
}

module.exports = {
    listarContatos,
    buscarContato,
    criarContato,
    atualizarContato,
    removerContato,
    formatarContato,
};
