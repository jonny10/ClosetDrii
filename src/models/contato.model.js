const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Contato = sequelize.define(
    "Contato",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome: { type: DataTypes.STRING(255), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false },
        assunto: { type: DataTypes.STRING(255), allowNull: false },
        mensagem: { type: DataTypes.TEXT, allowNull: false },
    },
    {
        tableName: "contatos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false, // a tabela só tem created_at
    }
);

// sem associações — mensagens do formulário de contato não referenciam outras tabelas

module.exports = Contato;
