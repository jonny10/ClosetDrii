// Modo offline: sobe a app com SQLite em memória, cria as tabelas e popula dados fake.
// Uso: npm run dev:offline  (não precisa de MySQL)
process.env.DB_DIALECT = "sqlite";

const app = require("../src/app");
const { sequelize, Categoria, Produto } = require("../src/models");

const PORT = process.env.PORT || 3000;

async function seed() {
    const categorias = await Categoria.bulkCreate([
        { nome: "Vestidos", descricao: "Vestidos para todas as ocasiões" },
        { nome: "Blusas", descricao: "Blusas e camisas femininas" },
        { nome: "Calças", descricao: "Calças, jeans e leggings" },
    ]);

    await Produto.bulkCreate([
        { nome: "Vestido Floral", descricao: "Vestido estampado com flores", preco: 129.9, categoria_id: categorias[0].id },
        { nome: "Vestido Preto Básico", descricao: "Clássico vestido preto", preco: 99.9, categoria_id: categorias[0].id },
        { nome: "Vestido Midi", descricao: "Vestido midi elegante", preco: 149.9, categoria_id: categorias[0].id },
        { nome: "Blusa de Seda", descricao: "Blusa leve de seda", preco: 89.9, categoria_id: categorias[1].id },
        { nome: "Camisa Branca", descricao: "Camisa social branca", preco: 79.9, categoria_id: categorias[1].id },
        { nome: "Cropped Básico", descricao: "Cropped canelado", preco: 49.9, categoria_id: categorias[1].id },
        { nome: "Calça Jeans Skinny", descricao: "Jeans skinny de cintura alta", preco: 119.9, categoria_id: categorias[2].id },
        { nome: "Legging Fitness", descricao: "Legging de academia", preco: 69.9, categoria_id: categorias[2].id },
    ]);

    console.log(`Seed ok ✔ (${categorias.length} categorias, 8 produtos)`);
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
