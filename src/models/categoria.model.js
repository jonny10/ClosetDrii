const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Categoria = sequelize.define(
    "Categoria",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome: { type: DataTypes.STRING(255), allowNull: false },
        descricao: { type: DataTypes.TEXT, allowNull: false },
    },
    {
        tableName: "categorias",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Categoria.associate = (models) => {
    Categoria.hasMany(
        models.Produto,
        { foreignKey: "categoria_id", as: "produtos" }
    );
};

module.exports = Categoria;
