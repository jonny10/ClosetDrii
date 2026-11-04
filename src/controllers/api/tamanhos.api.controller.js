const tamanhoService = require("../../services/tamanho.service");

// GET /api/tamanhos — lista ordenada (pública, usada nos selects/chips)
async function listarTamanhos(req, res, next) {
    try {
        const tamanhos = await tamanhoService.listarTamanhos();
        res.json(tamanhos);
    } catch (err) {
        next(err);
    }
}

function validarNome(nome) {
    const limpo = typeof nome === "string" ? nome.trim() : "";
    if (!limpo) return { erro: "Nome é obrigatório" };
    if (limpo.length > 10) return { erro: "Nome deve ter no máximo 10 caracteres" };
    return { nome: limpo };
}

// POST /api/admin/tamanhos — cria; 400 campos inválidos, 409 sigla duplicada
async function criarTamanho(req, res, next) {
    try {
        const resultado = validarNome(req.body?.nome);
        if (resultado.erro) {
            return res.status(400).json({ error: resultado.erro });
        }
        const nome = resultado.nome;

        let ordem = 0;
        if (req.body.ordem !== undefined) {
            ordem = Number(req.body.ordem);
            if (!Number.isInteger(ordem) || ordem < 0) {
                return res.status(400).json({ error: "Ordem deve ser um inteiro não-negativo" });
            }
        }

        const tamanho = await tamanhoService.criarTamanho({ nome, ordem });
        return res.status(201).json(tamanho);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// PATCH /api/admin/tamanhos/:id — update parcial de nome/ordem
async function atualizarTamanho(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const body = req.body || {};

        if (body.nome === undefined && body.ordem === undefined) {
            return res.status(400).json({ error: "Nenhum campo para atualizar" });
        }

        const dados = {};
        if (body.nome !== undefined) {
            const resultado = validarNome(body.nome);
            if (resultado.erro) {
                return res.status(400).json({ error: resultado.erro });
            }
            dados.nome = resultado.nome;
        }
        if (body.ordem !== undefined) {
            const ordem = Number(body.ordem);
            if (!Number.isInteger(ordem) || ordem < 0) {
                return res.status(400).json({ error: "Ordem deve ser um inteiro não-negativo" });
            }
            dados.ordem = ordem;
        }

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Tamanho não encontrado" });
        }

        const tamanho = await tamanhoService.atualizarTamanho(id, dados);
        if (!tamanho) {
            return res.status(404).json({ error: "Tamanho não encontrado" });
        }

        return res.json(tamanho);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// DELETE /api/admin/tamanhos/:id — 409 se variantes usarem a sigla
async function removerTamanho(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Tamanho não encontrado" });
        }

        const resultado = await tamanhoService.removerTamanho(id);
        if (!resultado) {
            return res.status(404).json({ error: "Tamanho não encontrado" });
        }

        return res.json(resultado);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

module.exports = {
    listarTamanhos,
    criarTamanho,
    atualizarTamanho,
    removerTamanho,
};
