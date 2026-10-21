const { UniqueConstraintError } = require("sequelize");
const authService = require("../../services/usuario.service");

// POST /api/auth/signup — valida campos obrigatórios, garante email único e grava senha com hash
async function cadastrar(req, res, next) {
    try {
        const { nome, email, senha, telefone } = req.body || {};

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: "Nome é obrigatório" });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
            return res.status(400).json({ error: "Email inválido" });
        }
        if (!senha || String(senha).length < 6) {
            return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
        }

        const usuario = await authService.criarUsuario({
            nome: String(nome).trim(),
            email: String(email).toLowerCase().trim(),
            senha,
            telefone: telefone ? String(telefone).trim() : null,
        });

        return res.status(201).json(usuario);
    } catch (err) {
        if (err instanceof UniqueConstraintError) {
            return res.status(409).json({ error: "Email já cadastrado" });
        }
        next(err);
    }
}

// POST /api/auth/login — valida email + senha e cria a sessão do usuário
async function login(req, res, next) {
    try {
        const { email, senha } = req.body || {};

        if (!email || !senha) {
            return res.status(400).json({ error: "Email e senha são obrigatórios" });
        }

        const usuario = await authService.buscarPorEmail(String(email).toLowerCase().trim());
        if (!usuario) {
            return res.status(401).json({ error: "Email inválido" });
        }

        const senhaValida = await authService.senhaConfere(usuario, senha);
        if (!senhaValida) {
            return res.status(401).json({ error: "Senha inválida" });
        }

        const usuarioFormatado = authService.formatarUsuario(usuario);

        req.session.isLoggedIn = true;
        req.session.user = usuarioFormatado;

        return res.json(usuarioFormatado);
    } catch (err) {
        next(err);
    }
}

// POST /api/auth/logout — destrói a sessão do usuário (idempotente: sem sessão também responde 200)
async function logout(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logout realizado" });
    });
}

module.exports = {
    cadastrar,
    login,
    logout,
};
