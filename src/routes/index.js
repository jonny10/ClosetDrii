const express = require('express');
const router = express.Router();

router.use(require("./site.routes"));
router.use(require("./auth.routes"));
router.use(require("./account.routes"));
router.use(require("./catalog.routes"));
router.use(require("./cart.routes"));
router.use(require("./admin.routes"));

module.exports = router;
