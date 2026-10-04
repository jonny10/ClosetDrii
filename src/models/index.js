const sequelize = require("../config/database");

const Usuario = require("./usuario.model");
const Endereco = require("./endereco.model");
const Categoria = require("./categoria.model");
const Produto = require("./produto.model");
const ProdutoVariante = require("./produto_variante.model");
const Venda = require("./venda.model");
const ProdutoVenda = require("./produto_venda.model");
const LogVenda = require("./log_venda.model");
const Avaliacao = require("./avaliacao.model");
const Contato = require("./contato.model");

// ...demais models

const models = { Usuario, Endereco, Categoria, Produto, ProdutoVariante, Venda, ProdutoVenda, LogVenda, Avaliacao, Contato };

// 1) todos os models já foram carregados acima
// 2) agora sim executa as associações
Object.values(models).forEach((model) => {
    if (typeof model.associate === "function") {
        model.associate(models);
    }
});

module.exports = { sequelize, ...models };
