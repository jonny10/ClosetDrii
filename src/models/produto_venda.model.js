const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProdutoVenda = sequelize.define(
    "ProdutoVenda",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        produto_variante_id: { type: DataTypes.INTEGER, allowNull: false },
        venda_id: { type: DataTypes.INTEGER, allowNull: false },
        quantidade: { type: DataTypes.INTEGER, allowNull: false },
        valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    },
    {
        tableName: "produto_vendas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

ProdutoVenda.associate = (models) => {
    ProdutoVenda.belongsTo(models.ProdutoVariante, { foreignKey: "produto_variante_id", as: "produto_variante" });
    ProdutoVenda.belongsTo(models.Venda, { foreignKey: "venda_id", as: "venda" });
};

module.exports = ProdutoVenda;
