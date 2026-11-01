const sequelize = require("../config/database");
const { Venda, ProdutoVenda, ProdutoVariante, Produto, Usuario, Endereco } = require("../models");

// Campos aceitos em criar/atualizar — whitelist evita mass-assignment.
// CRUD básico da tabela vendas: NÃO cria itens nem baixa estoque (isso é o
// registrarVenda, o fluxo transacional de checkout usado pelo POST /api/vendas).
const CAMPOS = ["valor_total", "usuario_id", "status", "endereco_entrega_id"];

// Monta o objeto só com os campos permitidos que vieram definidos (serve p/ create e update parcial)
function montarDados(dados = {}) {
    return CAMPOS.reduce((acc, campo) => {
        if (dados[campo] !== undefined) acc[campo] = dados[campo];
        return acc;
    }, {});
}

// Converte um item da venda (ProdutoVenda) no shape da API.
// A variante aparece só quando a associação foi carregada (include).
function formatarItem(item) {
    return {
        id: item.id,
        produto_variante_id: item.produto_variante_id,
        quantidade: item.quantidade,
        valor: Number(item.valor),
        produto_variante: item.produto_variante
            ? {
                  id: item.produto_variante.id,
                  cor: item.produto_variante.cor,
                  tamanho: item.produto_variante.tamanho,
                  imagem_url: item.produto_variante.imagem_url,
                  produto: item.produto_variante.produto
                      ? {
                            id: item.produto_variante.produto.id,
                            nome: item.produto_variante.produto.nome,
                        }
                      : undefined,
              }
            : undefined,
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
        comprovante_url: venda.comprovante_url,
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
                include: [
                    {
                        model: ProdutoVariante,
                        as: "produto_variante",
                        include: [{ model: Produto, as: "produto", attributes: ["id", "nome"] }],
                    },
                ],
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

// GET /api/vendas/minhas — histórico do usuário logado, com itens e detalhes da variante/produto
async function listarVendasDoUsuario(usuarioId) {
    const vendas = await Venda.findAll({
        where: { usuario_id: usuarioId },
        include: [
            {
                model: ProdutoVenda,
                as: "itens",
                include: [
                    {
                        model: ProdutoVariante,
                        as: "produto_variante",
                        include: [{ model: Produto, as: "produto", attributes: ["id", "nome"] }],
                    },
                ],
            },
        ],
        order: [["created_at", "DESC"]],
    });
    return vendas.map(formatarVenda);
}

// Erro de regra de negócio com status HTTP — o controller responde {error} e repassa o resto
function erroValidacao(status, message) {
    const erro = new Error(message);
    erro.status = status;
    return erro;
}

// POST /api/vendas — fluxo transacional do checkout (T20): valida estoque, recalcula
// os preços a partir do banco (nunca confia em preço do cliente), grava venda
// `pendente` + itens e dá baixa no estoque, tudo numa transação.
async function registrarVenda({ usuarioId, itens, enderecoEntregaId }) {
    const variantes = await ProdutoVariante.findAll({
        where: { id: itens.map((item) => item.id_variante) },
        include: [{ model: Produto, as: "produto", attributes: ["id", "nome", "preco"] }],
    });
    const variantePorId = new Map(variantes.map((variante) => [variante.id, variante]));

    for (const item of itens) {
        const variante = variantePorId.get(item.id_variante);
        if (!variante) {
            throw erroValidacao(400, `Variante de id ${item.id_variante} não encontrada`);
        }
        if (variante.estoque < item.quantidade) {
            throw erroValidacao(409, `Estoque insuficiente para "${variante.produto.nome}"`);
        }
    }

    if (enderecoEntregaId) {
        const endereco = await Endereco.findOne({
            where: { id: enderecoEntregaId, usuario_id: usuarioId },
        });
        if (!endereco) {
            throw erroValidacao(400, "Endereço de entrega inválido");
        }
    }

    const itensVenda = itens.map((item) => {
        const preco = Number(variantePorId.get(item.id_variante).produto.preco);
        return {
            produto_variante_id: item.id_variante,
            quantidade: item.quantidade,
            valor: preco * item.quantidade,
        };
    });
    const valorTotal = itensVenda.reduce((total, item) => total + item.valor, 0);

    const venda = await sequelize.transaction(async (t) => {
        const novaVenda = await Venda.create(
            {
                usuario_id: usuarioId,
                valor_total: valorTotal,
                status: "pendente",
                endereco_entrega_id: enderecoEntregaId || null,
            },
            { transaction: t }
        );

        await ProdutoVenda.bulkCreate(
            itensVenda.map((item) => ({ ...item, venda_id: novaVenda.id })),
            { transaction: t }
        );

        for (const item of itens) {
            await variantePorId.get(item.id_variante).decrement("estoque", {
                by: item.quantidade,
                transaction: t,
            });
        }

        return novaVenda;
    });

    return buscarVenda(venda.id);
}

// POST /api/vendas/:id/comprovante — vincula a URL do comprovante à venda do próprio
// usuário; null se a venda não existir ou não pertencer a ele
async function vincularComprovante(id, usuarioId, url) {
    const venda = await Venda.findOne({ where: { id, usuario_id: usuarioId } });
    if (!venda) return null;

    venda.comprovante_url = url;
    await venda.save();
    return formatarVenda(venda);
}

module.exports = {
    listarVendas,
    buscarVenda,
    criarVenda,
    atualizarVenda,
    removerVenda,
    listarVendasDoUsuario,
    registrarVenda,
    vincularComprovante,
    formatarVenda,
};
