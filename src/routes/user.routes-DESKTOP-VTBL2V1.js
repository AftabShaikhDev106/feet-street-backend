const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { profileUpload } = require('../config/multer.config');

// Get user profile
router.get('/me', authMiddleware, userController.getUserProfile);

// Update user profile
router.put('/me', authMiddleware, userController.updateUserProfile);

// Get user listings
router.get('/:id/listings', userController.getUserListings);

// Get user reviews
router.get('/:id/reviews', userController.getUserReviews);

// Upload profile image
router.post('/upload-image', authMiddleware, profileUpload.single('image'), userController.uploadProfileImage);

module.exports = router;