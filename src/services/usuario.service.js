const bcrypt = require("bcrypt");
const { Usuario } = require("../models");

// Remove dados sensíveis antes de devolver o usuário na resposta da API
function formatarUsuario(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        telefone: usuario.telefone,
        cpf: usuario.cpf,
        genero: usuario.genero,
        dt_nascimento: usuario.dt_nascimento,
    };
}

// POST /api/auth/signup — faz hash da senha (bcrypt) e grava o usuário
async function criarUsuario({ nome, email, senha, telefone = null }) {
    const senhaHash = await bcrypt.hash(senha, 12);
    const usuario = await Usuario.create({ nome, email, telefone, senha: senhaHash });
    return formatarUsuario(usuario);
}

// POST /api/auth/login — busca pelo email (paranoid já exclui os soft-deletados)
async function buscarPorEmail(email) {
    return Usuario.findOne({ where: { email } });
}

// Compara a senha enviada com o hash gravado no banco
async function senhaConfere(usuario, senha) {
    return bcrypt.compare(senha, usuario.senha);
}

// PATCH /api/usuarios/me — atualiza apenas os campos permitidos (whitelist)
// que vieram definidos no payload; null se o usuário não existir.
async function atualizarDados(id, dados = {}) {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;

    const campos = { nome: "nome", telefone: "telefone", cpf: "cpf", dt_nascimento: "dt_nascimento", genero: "genero" };
    const atualizacoes = {};
    for (const [chave, coluna] of Object.entries(campos)) {
        if (dados[chave] !== undefined) atualizacoes[coluna] = dados[chave];
    }

    if (Object.keys(atualizacoes).length > 0) {
        await usuario.update(atualizacoes);
    }

    return formatarUsuario(usuario);
}

module.exports = {
    criarUsuario,
    buscarPorEmail,
    senhaConfere,
    atualizarDados,
    formatarUsuario,
};
