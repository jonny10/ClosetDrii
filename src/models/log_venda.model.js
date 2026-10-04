const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LogVenda = sequelize.define(
    "LogVenda",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        venda_id: { type: DataTypes.INTEGER, allowNull: false },
        status_anterior: { type: DataTypes.STRING(20) },
        status_novo: { type: DataTypes.STRING(20) },
        alterado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        tableName: "log_vendas",
        timestamps: false, // a tabela não tem created_at/updated_at; usa alterado_em
    }
);

LogVenda.associate = (models) => {
    LogVenda.belongsTo(models.Venda, { foreignKey: "venda_id", as: "venda" });
};

module.exports = LogVenda;
