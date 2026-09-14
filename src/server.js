const path = require("path");
const express = require("express");
const apiRoutes = require("./routes");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = 3000;

app.listen(
    PORT,
    () => console.log(`Servidor em http://localhost:${PORT}`)
);
