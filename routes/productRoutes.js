const express = require('express');
const ctrl = require('../controllers/productController');

const router = express.Router();

// Public catalog — no auth.
router.get('/', ctrl.listPublicProducts);
router.get('/:slug', ctrl.getPublicProduct);

module.exports = router;
