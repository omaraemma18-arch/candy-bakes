const express = require('express');
const productCtrl = require('../controllers/productController');
const orderCtrl = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');

const router = express.Router();

// Everything below this line needs a valid session.
router.use(requireAuth);

router.get('/stats', orderCtrl.getStats);

// Products — staff can view, only admins can change the catalog.
router.get('/products', productCtrl.listAllProducts);
router.post('/products', requireRole('admin'), upload.array('images', 8), handleUploadErrors, productCtrl.createProduct);
router.put('/products/:id', requireRole('admin'), upload.array('images', 8), handleUploadErrors, productCtrl.updateProduct);
router.patch('/products/:id/availability', requireRole('admin'), productCtrl.toggleAvailability);
router.delete('/products/:id', requireRole('admin'), productCtrl.deleteProduct);

// Orders — staff can work the queue.
router.get('/orders', orderCtrl.listOrders);
router.patch('/orders/:id/status', orderCtrl.updateOrderStatus);

module.exports = router;
