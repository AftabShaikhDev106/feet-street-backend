const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// All wishlist routes require authentication
router.use(authMiddleware);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Add product to wishlist
router.post('/:productId', wishlistController.addToWishlist);

// Remove product from wishlist
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;