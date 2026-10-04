const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Avaliacao = sequelize.define(
    "Avaliacao",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        usuario_id: { type: DataTypes.INTEGER, allowNull: false },
        produto_id: { type: DataTypes.INTEGER, allowNull: false },
        nota: { type: DataTypes.INTEGER, allowNull: false },
        comentario: { type: DataTypes.TEXT },
    },
    {
        tableName: "avaliacoes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

Avaliacao.associate = (models) => {
    Avaliacao.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
    Avaliacao.belongsTo(models.Produto, { foreignKey: "produto_id", as: "produto" });
};

module.exports = Avaliacao;
