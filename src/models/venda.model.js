const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Venda = sequelize.define(
    "Venda",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        valor_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        usuario_id: { type: DataTypes.INTEGER, allowNull: false },
        status: {
            type: DataTypes.ENUM("pendente", "pago", "cancelado", "enviado"),
            defaultValue: "pendente",
        },
        endereco_entrega_id: { type: DataTypes.INTEGER },
    },
    {
        tableName: "vendas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Venda.associate = (models) => {
    Venda.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
    Venda.belongsTo(models.Endereco, { foreignKey: "endereco_entrega_id", as: "endereco_entrega" });
    Venda.hasMany(models.ProdutoVenda, { foreignKey: "venda_id", as: "itens" });
    Venda.hasMany(models.LogVenda, { foreignKey: "venda_id", as: "logs" });
};

module.exports = Venda;
