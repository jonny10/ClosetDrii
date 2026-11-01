const fs = require("fs");
const vendaService = require("../../services/venda.service");
const uploadComprovante = require("../../middlewares/upload-comprovante.middleware");

// Valida o corpo do checkout: array não-vazio de itens com id_variante/quantidade
// inteiros positivos, sem duplicatas (o carrinho já deduplica, mas o servidor revalida).
function validarItens(itens) {
    if (!Array.isArray(itens) || itens.length === 0) {
        return "Itens do pedido são obrigatórios";
    }

    const ids = itens.map((item) => item.id_variante);
    if (new Set(ids).size !== ids.length) {
        return "Itens duplicados no pedido";
    }

    for (const item of itens) {
        const idValido = Number.isInteger(item.id_variante) && item.id_variante > 0;
        const quantidadeValida = Number.isInteger(item.quantidade) && item.quantidade > 0;
        if (!idValido || !quantidadeValida) {
            return "Item inválido: id_variante e quantidade devem ser inteiros positivos";
        }
    }

    return null;
}

// POST /api/vendas — fecha o pedido: valida payload, grava venda pendente + itens
// e dá baixa no estoque (transação no service). Preços vêm do banco, nunca do cliente.
async function fecharPedido(req, res, next) {
    try {
        const { itens, endereco_entrega_id } = req.body || {};

        const erroItens = validarItens(itens);
        if (erroItens) {
            return res.status(400).json({ error: erroItens });
        }

        if (
            endereco_entrega_id !== undefined &&
            (!Number.isInteger(endereco_entrega_id) || endereco_entrega_id <= 0)
        ) {
            return res.status(400).json({ error: "Endereço de entrega inválido" });
        }

        const venda = await vendaService.registrarVenda({
            usuarioId: req.session.user.id,
            itens,
            enderecoEntregaId: endereco_entrega_id,
        });

        return res.status(201).json(venda);
    } catch (err) {
        if (err.status === 400 || err.status === 409) {
            return res.status(err.status).json({ error: err.message });
        }
        next(err);
    }
}

// GET /api/vendas/minhas — histórico do usuário logado
async function listarMinhas(req, res, next) {
    try {
        const vendas = await vendaService.listarVendasDoUsuario(req.session.user.id);
        return res.json(vendas);
    } catch (err) {
        next(err);
    }
}

// POST /api/admin/vendas/:id/comprovante — o admin anexa o comprovante recebido por
// WhatsApp (o upload é feito pelo multer antes de chegar aqui)
async function vincularComprovante(req, res, next) {
    try {
        const vendaId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(vendaId) || vendaId <= 0) {
            // id inválido não passa do multer: remove o arquivo recém-gravado e responde 404
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        const venda = await vendaService.vincularComprovante(vendaId, req.comprovanteUrl);

        if (!venda) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        return res.json(venda);
    } catch (err) {
        next(err);
    }
}

// GET /api/admin/vendas — painel do admin: todas as vendas com cliente e itens
async function listarTodas(req, res, next) {
    try {
        const vendas = await vendaService.listarVendas({});
        return res.json(vendas);
    } catch (err) {
        next(err);
    }
}

const STATUS_PERMITIDOS = ["pendente", "pago", "enviado", "cancelado"];

// PATCH /api/admin/vendas/:id/status — muda o status da venda (admin)
async function atualizarStatus(req, res, next) {
    try {
        const vendaId = Number.parseInt(req.params.id, 10);
        const { status } = req.body || {};

        if (!STATUS_PERMITIDOS.includes(status)) {
            return res.status(400).json({ error: "Status inválido" });
        }

        if (!Number.isInteger(vendaId) || vendaId <= 0) {
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        const venda = await vendaService.atualizarVenda(vendaId, { status });

        if (!venda) {
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        return res.json(venda);
    } catch (err) {
        next(err);
    }
}

// DELETE /api/admin/vendas/:id/comprovante — remove o comprovante da venda (admin)
async function removerComprovante(req, res, next) {
    try {
        const vendaId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(vendaId) || vendaId <= 0) {
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        const resultado = await vendaService.removerComprovante(vendaId);
        if (!resultado) {
            return res.status(404).json({ error: "Venda não encontrada" });
        }

        // apaga o arquivo do disco quando existir (idempotente)
        const caminho = uploadComprovante.caminhoComprovante(resultado.urlAntiga);
        if (caminho) {
            fs.unlink(caminho, () => {});
        }

        return res.json(resultado.venda);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    fecharPedido,
    listarMinhas,
    vincularComprovante,
    listarTodas,
    atualizarStatus,
    removerComprovante,
};
