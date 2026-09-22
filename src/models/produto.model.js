const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Produto = sequelize.define(
    "Produto",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome: { type: DataTypes.STRING(255), allowNull: false },
        descricao: { type: DataTypes.TEXT, allowNull: false },
        preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        categoria_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
        tableName: "produtos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Produto.associate = (models) => {
    Produto.belongsTo(models.Categoria, { foreignKey: "categoria_id", as: "categoria" });
};

module.exports = Produto;
