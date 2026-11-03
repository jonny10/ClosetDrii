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

// sem associações — produto_variantes.tamanho guarda o texto (sem FK)

module.exports = Tamanho;
