const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// All order routes require authentication
router.use(authMiddleware);

// Get all orders for user
router.get('/', orderController.getUserOrders);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Create new order
router.post('/', orderController.createOrder);

// Update order status
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
