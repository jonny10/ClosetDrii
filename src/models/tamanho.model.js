const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tamanho = sequelize.define(
    "Tamanho",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome: { type: DataTypes.STRING(10), allowNull: false, unique: true },
        ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        tableName: "tamanhos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Tamanho.associate = (models) => {
    Tamanho.hasMany(models.ProdutoVariante, { foreignKey: "tamanho_id", as: "variantes" });
};

module.exports = Tamanho;
