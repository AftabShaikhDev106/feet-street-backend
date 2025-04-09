const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/categories', productController.getCategories);
router.get('/search', productController.searchProducts);

// Protected routes
router.use(authMiddleware);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.post('/upload-image', upload.single('image'), productController.uploadImage);

// Reviews
router.post('/:id/reviews', productController.addReview);
router.get('/:id/reviews', productController.getReviews);

module.exports = router;