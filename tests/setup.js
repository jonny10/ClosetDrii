// Setup global dos testes: roda ANTES de cada arquivo de teste importar a app.
// Define SQLite em memória (DB_DIALECT=sqlite) pra não depender de MySQL local.
process.env.DB_DIALECT = "sqlite";
