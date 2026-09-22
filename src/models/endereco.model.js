const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Endereco = sequelize.define(
    "Endereco",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        usuario_id: { type: DataTypes.INTEGER, allowNull: false },
        rua: { type: DataTypes.STRING(255), allowNull: false },
        numero: { type: DataTypes.STRING(10), allowNull: false },
        bairro: { type: DataTypes.STRING(100), allowNull: false },
        cidade: { type: DataTypes.STRING(255), allowNull: false },
        estado: { type: DataTypes.CHAR(2), allowNull: false },
        cep: { type: DataTypes.CHAR(8), allowNull: false },
        complemento: { type: DataTypes.STRING(255) }
    },
    {
        tableName: "enderecos",
        timestamps: true,
        paranoid: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
    }
);

Endereco.associate = (models) => {
    Endereco.belongsTo(models.Usuario, { foreignKey: "usuario_id", as: "usuario" });
};

module.exports = Endereco;
