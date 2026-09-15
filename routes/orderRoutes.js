const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/orderController');

const router = express.Router();

// A single browser shouldn't be able to flood the kitchen with orders.
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many orders from this connection. Please call us instead.' },
});

router.post('/', orderLimiter, ctrl.createOrder);
router.get('/:reference', ctrl.getOrderByReference);

module.exports = router;
