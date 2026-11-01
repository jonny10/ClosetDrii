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

// PATCH /api/usuarios/me — valida e atualiza os dados do usuário logado.
// Só aceita os campos editáveis do perfil; o id vem da sessão (nunca do body).
async function atualizarMeusDados(req, res, next) {
    try {
        const { nome, telefone, cpf, dt_nascimento, genero } = req.body || {};

        if (nome !== undefined && (!nome || !String(nome).trim())) {
            return res.status(400).json({ error: "Nome é obrigatório" });
        }

        const apenasDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");
        if (telefone !== undefined) {
            const tel = apenasDigitos(telefone);
            if (tel !== "" && (tel.length < 10 || tel.length > 11)) {
                return res.status(400).json({ error: "Telefone inválido" });
            }
        }
        if (cpf !== undefined) {
            const cpfLimpo = apenasDigitos(cpf);
            if (cpfLimpo !== "" && cpfLimpo.length !== 11) {
                return res.status(400).json({ error: "CPF deve ter 11 dígitos" });
            }
        }
        if (dt_nascimento !== undefined && dt_nascimento !== null && dt_nascimento !== "") {
            const data = new Date(`${dt_nascimento}T00:00:00Z`);
            if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== dt_nascimento) {
                return res.status(400).json({ error: "Data de nascimento inválida (use AAAA-MM-DD)" });
            }
        }
        if (genero !== undefined && genero !== null && genero !== "" && !["M", "F", "N/I"].includes(genero)) {
            return res.status(400).json({ error: "Gênero inválido" });
        }

        const camposPermitidos = ["nome", "telefone", "cpf", "dt_nascimento", "genero"];
        const chavesRecebidas = Object.keys(req.body || {});
        const desconhecidos = chavesRecebidas.filter((k) => !camposPermitidos.includes(k));
        if (desconhecidos.length > 0) {
            return res.status(400).json({ error: `Campo não permitido: ${desconhecidos[0]}` });
        }

        const usuario = await authService.atualizarDados(req.session.user.id, {
            nome: nome !== undefined ? String(nome).trim() : undefined,
            telefone: telefone !== undefined ? (apenasDigitos(telefone) || null) : undefined,
            cpf: cpf !== undefined ? (apenasDigitos(cpf) || null) : undefined,
            dt_nascimento: dt_nascimento !== undefined ? (dt_nascimento || null) : undefined,
            genero: genero !== undefined ? (genero || null) : undefined,
        });

        if (!usuario) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Não autenticado" });
        }

        // mantém o snapshot da sessão sincronizado (nome no header, por exemplo)
        req.session.user = usuario;

        return res.json(usuario);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    cadastrar,
    login,
    logout,
    atualizarMeusDados,
};
