require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        await sequelize.authenticate();
        console.log("Banco conectado ✔");
    } catch (err) {
        console.error("Falha ao conectar no banco:", err.message);
    }
}

start();

app.listen(PORT, () => {
    console.log(`Servidor em http://localhost:${PORT}`);
});
