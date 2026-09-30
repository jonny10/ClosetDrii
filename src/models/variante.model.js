const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Variante = sequelize.define(
    "Variante",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        produto_id: { type: DataTypes.INTEGER, allowNull: false },
        cor: { type: DataTypes.STRING(50), allowNull: false },
        tamanho: { type: DataTypes.STRING(10), allowNull: false },
        imagem_url: { type: DataTypes.STRING(255), allowNull: true },
        estoque: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        tableName: "produto_variantes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Variante.associate = (models) => {
    Variante.belongsTo(models.Produto, { foreignKey: "produto_id", as: "produto" });
};

module.exports = Variante;
