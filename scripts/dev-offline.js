// Modo offline: sobe a app com SQLite em memória, cria as tabelas e popula dados fake.
// Uso: npm run dev:offline  (não precisa de MySQL)
process.env.DB_DIALECT = "sqlite";

const path = require("path");
const app = require("../src/app");
const {
    sequelize,
    Usuario,
    Endereco,
    Categoria,
    Produto,
    ProdutoVariante,
    Venda,
    ProdutoVenda,
    Contato,
    Avaliacao,
    LogVenda,
} = require("../src/models");

const PORT = process.env.PORT || 3000;

// carrega um JSON da pasta mocks/ (um arquivo por tabela, ids explícitos preservam as FKs)
function carregarMock(tabela) {
    return require(path.join(__dirname, "..", "mocks", `${tabela}.json`));
}

async function seed() {
    // ordem importa: pais antes dos filhos (Fks de produto_variantes -> produtos -> categorias, etc.)
    const usuarios = await Usuario.bulkCreate(carregarMock("usuarios"));
    const enderecos = await Endereco.bulkCreate(carregarMock("enderecos"));
    const categorias = await Categoria.bulkCreate(carregarMock("categorias"));
    const produtos = await Produto.bulkCreate(carregarMock("produtos"));
    const produtoVariantes = await ProdutoVariante.bulkCreate(carregarMock("produto_variantes"));
    const vendas = await Venda.bulkCreate(carregarMock("vendas"));
    const produtoVendas = await ProdutoVenda.bulkCreate(carregarMock("produto_vendas"));
    const contatos = await Contato.bulkCreate(carregarMock("contatos"));
    const avaliacoes = await Avaliacao.bulkCreate(carregarMock("avaliacoes"));
    const logVendas = await LogVenda.bulkCreate(carregarMock("log_vendas"));

    console.log(
        `Seed ok ✔ (${usuarios.length} usuários, ${enderecos.length} endereços, ` +
            `${categorias.length} categorias, ${produtos.length} produtos, ` +
            `${produtoVariantes.length} variantes, ${vendas.length} vendas, ` +
            `${produtoVendas.length} itens de venda, ${contatos.length} contatos, ` +
            `${avaliacoes.length} avaliações, ${logVendas.length} logs de venda)`
    );
}

async function start() {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // recria as tabelas a cada boot (banco em memória)
    await seed();

    app.listen(PORT, () => {
        console.log(`Servidor em http://localhost:${PORT} (SQLite em memória, sem MySQL)`);
    });
}

start().catch((err) => {
    console.error("Falha ao iniciar o modo offline:", err.message);
    process.exit(1);
});
