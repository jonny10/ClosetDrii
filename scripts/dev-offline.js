// Modo offline: sobe a app com SQLite em memória, cria as tabelas e popula dados fake.
// Uso: npm run dev:offline  (não precisa de MySQL)
process.env.DB_DIALECT = "sqlite";

const app = require("../src/app");
const { seed, sequelize } = require("../src/seed");

const PORT = process.env.PORT || 3000;

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
