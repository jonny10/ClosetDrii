const categoriaService = require("../../services/categoria.service");

// GET /api/categorias — lista ordenada por nome
async function listarCategorias(req, res, next) {
    try {
        const categorias = await categoriaService.listarCategorias();
        res.json(categorias);
    } catch (err) {
        next(err);
    }
}

// GET /api/categorias/:id — detalhe; 404 JSON se não existir
async function buscarCategoria(req, res, next) {
    try {
        const categoria = await categoriaService.buscarCategoria(Number(req.params.id));
        if (!categoria) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }
        res.json(categoria);
    } catch (err) {
        next(err);
    }
}

// Valida o corpo de criação: nome e descrição obrigatórios
function validarDados(body = {}) {
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const descricao = typeof body.descricao === "string" ? body.descricao.trim() : "";
    if (!nome) return "Nome é obrigatório";
    if (!descricao) return "Descrição é obrigatória";
    return { nome, descricao };
}

// POST /api/admin/categorias — cria; 400 campos inválidos, 409 nome duplicado
async function criarCategoria(req, res, next) {
    try {
        const dados = validarDados(req.body);
        if (typeof dados === "string") {
            return res.status(400).json({ error: dados });
        }

        const categoria = await categoriaService.criarCategoria(dados);
        return res.status(201).json(categoria);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// PATCH /api/admin/categorias/:id — update parcial de nome/descricao
async function atualizarCategoria(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const body = req.body || {};

        if (body.nome === undefined && body.descricao === undefined) {
            return res.status(400).json({ error: "Nenhum campo para atualizar" });
        }

        const dados = {};
        if (body.nome !== undefined) {
            if (typeof body.nome !== "string" || !body.nome.trim()) {
                return res.status(400).json({ error: "Nome é obrigatório" });
            }
            dados.nome = body.nome.trim();
        }
        if (body.descricao !== undefined) {
            if (typeof body.descricao !== "string" || !body.descricao.trim()) {
                return res.status(400).json({ error: "Descrição é obrigatória" });
            }
            dados.descricao = body.descricao.trim();
        }

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        const categoria = await categoriaService.atualizarCategoria(id, dados);
        if (!categoria) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        return res.json(categoria);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// DELETE /api/admin/categorias/:id — 409 se houver produtos na categoria
async function removerCategoria(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        const resultado = await categoriaService.removerCategoria(id);
        if (!resultado) {
            return res.status(404).json({ error: "Categoria não encontrada" });
        }

        return res.json(resultado);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

module.exports = {
    listarCategorias,
    buscarCategoria,
    criarCategoria,
    atualizarCategoria,
    removerCategoria,
};
