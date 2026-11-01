const enderecoService = require("../../services/endereco.service");

// Campos obrigatórios do endereço de entrega (complemento é opcional)
const CAMPOS_OBRIGATORIOS = ["rua", "numero", "bairro", "cidade", "estado", "cep"];

// Valida o payload do POST /api/enderecos; devolve a mensagem de erro ou null
function validarEndereco(body) {
    for (const campo of CAMPOS_OBRIGATORIOS) {
        if (!body[campo] || !String(body[campo]).trim()) {
            return `${campo.charAt(0).toUpperCase() + campo.slice(1)} é obrigatório`;
        }
    }

    if (!/^[A-Za-z]{2}$/.test(String(body.estado).trim())) {
        return "Estado deve ter 2 letras (ex.: SP)";
    }

    if (!/^\d{8}$/.test(String(body.cep).trim())) {
        return "CEP deve ter 8 dígitos";
    }

    return null;
}

// GET /api/enderecos — lista apenas os endereços do usuário logado
async function listar(req, res, next) {
    try {
        const enderecos = await enderecoService.listarEnderecos({
            usuarioId: req.session.user.id,
        });
        return res.json(enderecos);
    } catch (err) {
        next(err);
    }
}

// POST /api/enderecos — cria endereço do usuário logado (usuario_id sempre da sessão,
// nunca do body)
async function criar(req, res, next) {
    try {
        const erro = validarEndereco(req.body || {});
        if (erro) {
            return res.status(400).json({ error: erro });
        }

        const endereco = await enderecoService.criarEndereco({
            usuario_id: req.session.user.id,
            rua: String(req.body.rua).trim(),
            numero: String(req.body.numero).trim(),
            bairro: String(req.body.bairro).trim(),
            cidade: String(req.body.cidade).trim(),
            estado: String(req.body.estado).trim().toUpperCase(),
            cep: String(req.body.cep).trim(),
            complemento: req.body.complemento ? String(req.body.complemento).trim() : null,
        });

        return res.status(201).json(endereco);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listar,
    criar,
};
