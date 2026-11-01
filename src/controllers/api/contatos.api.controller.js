const contatoService = require("../../services/contato.service");

// Valida o payload do formulário público de contato: campos obrigatórios
// (trim) e formato de e-mail. Devolve os dados prontos ou a mensagem de erro.
function validarMensagem(body = {}) {
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const assunto = typeof body.assunto === "string" ? body.assunto.trim() : "";
    const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";

    if (!nome) return "Nome é obrigatório";
    if (!email) return "E-mail é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido";
    if (!assunto) return "Assunto é obrigatório";
    if (!mensagem) return "Mensagem é obrigatória";

    return { nome, email, assunto, mensagem };
}

// POST /api/contatos — envio público do formulário de contato (sem sessão)
async function criarContato(req, res, next) {
    try {
        const dados = validarMensagem(req.body);
        if (typeof dados === "string") {
            return res.status(400).json({ error: dados });
        }

        const contato = await contatoService.criarContato(dados);
        return res.status(201).json(contato);
    } catch (err) {
        next(err);
    }
}

// GET /api/admin/contatos — painel do admin: todas as mensagens, mais recentes primeiro
async function listarMensagens(req, res, next) {
    try {
        const contatos = await contatoService.listarContatos();
        return res.json(contatos);
    } catch (err) {
        next(err);
    }
}

// PATCH /api/admin/contatos/:id — marca a mensagem como respondida (admin).
// Sem body marca true; com body aceita { respondida: boolean }.
async function marcarRespondida(req, res, next) {
    try {
        const contatoId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(contatoId) || contatoId <= 0) {
            return res.status(404).json({ error: "Contato não encontrado" });
        }

        const { respondida } = req.body || {};
        if (respondida !== undefined && typeof respondida !== "boolean") {
            return res.status(400).json({ error: "Campo respondida deve ser booleano" });
        }

        const contato = await contatoService.marcarRespondida(
            contatoId,
            respondida === undefined ? true : respondida
        );

        if (!contato) {
            return res.status(404).json({ error: "Contato não encontrado" });
        }

        return res.json(contato);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    criarContato,
    listarMensagens,
    marcarRespondida,
};
