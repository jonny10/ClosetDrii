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
    console.log(usuario.senha, senha);
    return bcrypt.compare(senha, usuario.senha);
}

module.exports = {
    criarUsuario,
    buscarPorEmail,
    senhaConfere,
    formatarUsuario,
};
