const { Venda, ProdutoVenda, ProdutoVariante, Usuario, Endereco } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment.
// CRUD básico da tabela vendas: NÃO cria itens nem baixa estoque (isso é o fluxo
// transacional de checkout, a ser feito depois num registrarVenda dedicado).
const CAMPOS = ["valor_total", "usuario_id", "status", "endereco_entrega_id"];

// Monta o objeto só com os campos permitidos que vieram definidos (serve p/ create e update parcial)
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte um item da venda (ProdutoVenda) no shape da API
function formatarItem(item) {
    return {
        id: item.id,
        produto_variante_id: item.produto_variante_id,
        quantidade: item.quantidade,
        valor: Number(item.valor),
    };
}

// Converte a instância do Sequelize no shape que a API devolve.
// itens/usuario/endereco só aparecem quando a associação foi carregada (include).
function formatarVenda(venda) {
    return {
        id: venda.id,
        valor_total: Number(venda.valor_total),
        status: venda.status,
        usuario_id: venda.usuario_id,
        endereco_entrega_id: venda.endereco_entrega_id,
        created_at: venda.created_at,
        usuario: venda.usuario
            ? { id: venda.usuario.id, nome: venda.usuario.nome }
            : undefined,
        itens: venda.itens ? venda.itens.map(formatarItem) : undefined,
    };
}

// GET /api/vendas — lista; filtros opcionais por usuário e status
async function listarVendas({ usuarioId, status } = {}) {
    const where = {};
    if (usuarioId) where.usuario_id = usuarioId;
    if (status) where.status = status;

    const vendas = await Venda.findAll({
        where,
        include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome"] }],
        order: [["created_at", "DESC"]],
    });
    return vendas.map(formatarVenda);
}

// GET /api/vendas/:id — detalhe com itens, usuário e endereço; null se não existir
async function buscarVenda(id) {
    const venda = await Venda.findByPk(id, {
        include: [
            { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
            { model: Endereco, as: "endereco_entrega" },
            {
                model: ProdutoVenda,
                as: "itens",
                include: [{ model: ProdutoVariante, as: "produto_variante" }],
            },
        ],
    });
    return venda ? formatarVenda(venda) : null;
}

// POST /api/vendas
async function criarVenda(dados) {
    const venda = await Venda.create(montarDados(dados));
    return formatarVenda(venda);
}

// PUT/PATCH /api/vendas/:id — null se não existir
async function atualizarVenda(id, dados) {
    const venda = await Venda.findByPk(id);
    if (!venda) return null;

    await venda.update(montarDados(dados));
    return formatarVenda(venda);
}

// DELETE /api/vendas/:id — false se não existir
async function removerVenda(id) {
    const venda = await Venda.findByPk(id);
    if (!venda) return false;

    await venda.destroy();
    return true;
}

module.exports = {
    listarVendas,
    buscarVenda,
    criarVenda,
    atualizarVenda,
    removerVenda,
    formatarVenda,
};
