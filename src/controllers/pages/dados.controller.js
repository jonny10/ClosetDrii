const { Op } = require("sequelize");
const { Venda, ProdutoVenda, ProdutoVariante, Produto } = require("../../models");

function formatarPreco(valor) {
    return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

const MEDALHAS = ["pos-gold", "pos-silver", "pos-bronze"];

// Dashboard do admin (/dados): KPIs + ranking de looks mais vendidos computados
// NO SERVIDOR (vendas × produto_vendas × produtos) e renderizados via {{#each}}.
// Vendas CANCELADAS ficam fora das métricas. Página fala direto com os models.
async function renderDados(req, res, next) {
    try {
        const vendasValidas = await Venda.findAll({
            where: { status: { [Op.ne]: "cancelado" } },
            raw: true,
        });
        const itens = await ProdutoVenda.findAll({
            include: [
                {
                    model: ProdutoVariante,
                    as: "produto_variante",
                    attributes: ["produto_id"],
                    include: [{ model: Produto, as: "produto", attributes: ["nome"] }],
                },
            ],
            order: [["id", "ASC"]],
            raw: true,
        });

        const idsValidas = new Set(vendasValidas.map((venda) => venda.id));
        const itensValidos = itens.filter((item) => idsValidas.has(item.venda_id));

        const faturamento = vendasValidas.reduce((soma, venda) => soma + Number(venda.valor_total), 0);
        const pedidos = vendasValidas.length;
        const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;
        const pecasVendidas = itensValidos.reduce((soma, item) => soma + item.quantidade, 0);

        // Ranking por volume físico, agregado por produto (variantes do mesmo look somam)
        const porProduto = new Map();
        for (const item of itensValidos) {
            const nome = item["produto_variante.produto.nome"] ?? "Look Closet Drii";
            const atual = porProduto.get(nome) || { quantidade: 0, receita: 0 };
            atual.quantidade += item.quantidade;
            atual.receita += Number(item.valor);
            porProduto.set(nome, atual);
        }

        const ranking = [...porProduto.entries()]
            .map(([nome, dados]) => ({ nome, quantidade: dados.quantidade, receita: formatarPreco(dados.receita) }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10)
            .map((item, index) => ({ ...item, posicao: index + 1, medalhaClasse: MEDALHAS[index] || "" }));

        res.render("pages/dados", {
            title: "Closet Drii | Dados",
            pageStyle: "dados",
            pageScript: "dados",
            kpis: {
                faturamento: formatarPreco(faturamento),
                pedidos,
                ticket_medio: formatarPreco(ticketMedio),
                pecas_vendidas: pecasVendidas,
            },
            ranking,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = renderDados;
