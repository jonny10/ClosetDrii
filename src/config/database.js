require("dotenv").config();
const { Sequelize } = require("sequelize");

// DB_DIALECT=sqlite sobe um SQLite em memória (ou arquivo via DB_STORAGE) — modo offline/teste, sem MySQL
const dialect = process.env.DB_DIALECT || "mysql";

const sequelize =
    dialect === "sqlite"
        ? new Sequelize({
              dialect: "sqlite",
              storage: process.env.DB_STORAGE || ":memory:",
              logging: false,
          })
        : new Sequelize(
              process.env.DB_NAME,
              process.env.DB_USER,
              process.env.DB_PASSWORD,
              {
                  host: process.env.DB_HOST,
                  port: process.env.DB_PORT || 3306,
                  dialect: "mysql",
                  logging: false,
              }
          );

module.exports = sequelize;
