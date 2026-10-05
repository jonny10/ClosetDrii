const express = require('express');
const router = express.Router();

// Páginas: uma rota por arquivo (sem conceito de área)
router.use(require("./pages/home.routes"));
router.use(require("./pages/about.routes"));
router.use(require("./pages/contact.routes"));
router.use(require("./pages/contact_adm.routes"));
router.use(require("./pages/login.routes"));
router.use(require("./pages/signup.routes"));
router.use(require("./pages/profile.routes"));
router.use(require("./pages/historico.routes"));
router.use(require("./pages/dados.routes"));
router.use(require("./pages/produtos.routes"));
router.use(require("./pages/catalogo.routes"));
router.use(require("./pages/cart.routes"));
router.use(require("./pages/vendas.routes"));

// API: CRUDs do banco, um arquivo por entidade
router.use("/api", require("./api/produto.api.routes"));
router.use("/api", require("./api/categoria.api.routes"));

module.exports = router;
