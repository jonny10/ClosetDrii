const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");
const routes = require("./routes");

const app = express();

// --- View engine (Handlebars) ---
app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// --- Middlewares globais ---
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // formulários HTML (login, cadastro)
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Disponibiliza dados p/ todas as views (ex.: usuário logado) ---
app.use((req, res, next) => {
    res.locals.user = req.user || null; // preenchido futuramente pelo middleware de auth
    next();
});

// --- Rotas ---
app.use("/", routes);

// --- 404 ---
app.use((req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }
  res.status(404).render("pages/404", { title: "Página não encontrada", pageStyle: "404" });
});

// --- Handler global de erros ---
app.use((err, req, res, next) => {
  console.error(err);

  // API responde JSON padronizado; views caem na página de erro
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      error: err.message || "Erro interno do servidor",
    });
  }

  res.status(err.status || 500).render("pages/error", {
    title: "Erro",
    message: err.message,
  });
});

module.exports = app;
