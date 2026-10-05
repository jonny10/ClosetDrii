const express = require("express");
const router = express.Router();

const categoriasController = require("../../controllers/api/categorias.api.controller");
const logger = require("../../middlewares/logger.middleware");

router.get("/categorias", logger, categoriasController.listarCategorias);

module.exports = router;
