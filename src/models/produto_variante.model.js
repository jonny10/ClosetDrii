const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProdutoVariante = sequelize.define(
    "ProdutoVariante",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        produto_id: { type: DataTypes.INTEGER, allowNull: false },
        cor: { type: DataTypes.STRING(50), allowNull: false },
        tamanho: { type: DataTypes.STRING(10), allowNull: false },
        imagem_url: { type: DataTypes.STRING(255) },
        estoque: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        tableName: "produto_variantes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [{ unique: true, fields: ["produto_id", "cor", "tamanho"] }],
    }
);

ProdutoVariante.associate = (models) => {
    ProdutoVariante.belongsTo(models.Produto, { foreignKey: "produto_id", as: "produto" });
    ProdutoVariante.hasMany(models.ProdutoVenda, { foreignKey: "produto_variante_id", as: "produto_vendas" });
};

module.exports = ProdutoVariante;
