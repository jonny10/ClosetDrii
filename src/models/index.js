const sequelize = require("../config/database");

const Usuario = require("./usuario.model");
const Endereco = require("./endereco.model");
const Categoria = require("./categoria.model");
const Produto = require("./produto.model");

// ...demais models

const models = { Usuario, Endereco, Categoria, Produto };

// 1) todos os models já foram carregados acima
// 2) agora sim executa as associações
Object.values(models).forEach((model) => {
    if (typeof model.associate === "function") {
        model.associate(models);
    }
});

module.exports = { sequelize, ...models };
