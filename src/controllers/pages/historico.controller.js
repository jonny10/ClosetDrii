const {
    Venda,
    ProdutoVenda,
    ProdutoVariante,
    Produto,
    Tamanho,
} = require("../../models");

function formatarPreco(valor) {
    return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

function formatarData(data) {
    return new Date(data).toLocaleDateString("pt-BR");
}

async function renderHistorico(req, res, next) {
    try {
        const vendas = await Venda.findAll({
            where: { usuario_id: req.session.user.id },
            order: [["id", "DESC"]],
            include: [
                {
                    model: ProdutoVenda,
                    as: "itens",
                    include: [
                        {
                            model: ProdutoVariante,
                            as: "produto_variante",
                            include: [
                                { model: Produto, as: "produto" },
                                { model: Tamanho, as: "tamanho" },
                            ],
                        },
                    ],
                },
            ],
        });

        const pedidos = vendas.map((venda) => ({
            id: String(venda.id).padStart(4, "0"),
            data: formatarData(venda.created_at),
            status: venda.status,
            total: formatarPreco(venda.valor_total),
            itens: (venda.itens || []).map((item) => {
                const variante = item.produto_variante || {};
                return {
                    nome: variante.produto?.nome ?? "Look Closet Drii",
                    cor: variante.cor || "Padrão",
                    tamanho: variante.tamanho?.nome ?? "U",
                    imagem_url:
                        variante.imagem_url || "/assets/img/logo.png",
                    quantidade: item.quantidade,
                    unitario: formatarPreco(item.valor / item.quantidade),
                    subtotal: formatarPreco(item.valor),
                };
            }),
        }));

        res.render("pages/historico", {
            title: "Closet Drii | Histórico",
            pageStyle: "historico",
            pedidos,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = renderHistorico;
