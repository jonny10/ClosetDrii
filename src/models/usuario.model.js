const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Usuario = sequelize.define(
    "Usuario",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome: { type: DataTypes.STRING(250), allowNull: false },
        email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
        senha: { type: DataTypes.STRING(255), allowNull: false },
        telefone: { type: DataTypes.STRING(13) },
        cpf: { type: DataTypes.CHAR(11) },
        perfil: { type: DataTypes.ENUM("cliente", "admin"), defaultValue: "cliente" },
        genero: { type: DataTypes.ENUM("M", "F", "N/I") },
        dt_nascimento: { type: DataTypes.DATEONLY },
    },
    {
        tableName: "usuarios",
        timestamps: true,
        paranoid: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
    }
);

// declara as relações do Usuario (recebe todos os models já carregados)
Usuario.associate = (models) => {
    Usuario.hasMany(models.Endereco, { foreignKey: "usuario_id", as: "enderecos" });
};

module.exports = Usuario;
