const Product = require('../models/product.model');
const User = require('../models/user.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Get all products
exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, condition, minPrice, maxPrice, sort } = req.query;
    
    // Build query
    const query = { status: 'available' };
    
    if (category) {
      query.category = category;
    }
    
    if (condition) {
      query.condition = condition;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    // Build sort options
    let sortOptions = {};
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else {
      // Default sort by latest
      sortOptions = { createdAt: -1 };
    }
    
    const products = await Product.find(query)
      .sort(sortOptions)
      .populate('reviews.user', 'username')
      .exec();
    
    res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// Get product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .populate('reviews.user', 'username')
      .exec();
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get seller information
    const seller = await User.findById(product.seller, 'username profile');
    
    res.status(200).json({
      product,
      seller,
    });
  } catch (error) {
    next(error);
  }
};

// Create new product
exports.createProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if user has completed profile
    if (!req.user.profileCompleted) {
      return res.status(403).json({
        message: 'Please complete your profile before listing a product',
      });
    }
    
    const {
      title,
      description,
      brand,
      category = 'Shoes', // Default category
      size,
      condition,
      images,
      price,
    } = req.body;
    
    // Create new product
    const product = new Product({
      seller: userId,
      title,
      description,
      brand,
      category,
      size,
      condition,
      images,
      price,
      status: 'available',
      reviews: [],
    });
    
    await product.save();
    
    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== userId) {
      return res.status(403).json({
        message: 'You are not authorized to update this product',
      });
    }
    
    // Update product fields
    const {
      title,
      description,
      brand,
      category,
      size,
      condition,
      images,
      price,
      status,
    } = req.body;
    
    if (title) product.title = title;
    if (description) product.description = description;
    if (brand) product.brand = brand;
    if (category) product.category = category;
    if (size) product.size = size;
    if (condition) product.condition = condition;
    if (images) product.images = images;
    if (price) product.price = price;
    if (status) product.status = status;
    
    await product.save();
    
    res.status(200).json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller
    if (product.seller.toString() !== userId) {
      return res.status(403).json({
        message: 'You are not authorized to delete this product',
      });
    }
    
    await Product.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Upload product image
// src/controllers/product.controller.js

exports.uploadImage = async (req, res, next) => {
  try {
    console.log('Upload image request received');

    console.log(req.files)
    
    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ message: 'No image files provided' });
    }
    
    console.log('Files received:', req.files.length);
    
    // Process all uploaded files
    const imageUrls = req.files.map(file => {
      console.log('Processing file:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        filename: file.filename,
        path: file.path,
        size: file.size,
      });
      
      // Create URL for each file
      return `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`;
    });
    
    res.status(200).json({
      message: 'Images uploaded successfully',
      imageUrl: imageUrls[0], // For backward compatibility
      imageUrls: imageUrls // For future use
    });
  } catch (error) {
    console.log('Image upload error:', error);
    next(error);
  }
};

// Get product categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    
    res.status(200).json({
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Search in title, description, and brand
    const products = await Product.find({
      $and: [
        { status: 'available' },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { brand: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('reviews.user', 'username')
      .exec();
    
    res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

// Add review to product
exports.addReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if user is the seller
    if (product.seller.toString() === userId) {
      return res.status(403).json({
        message: 'You cannot review your own product',
      });
    }
    
    // Check if user has already reviewed this product
    const existingReviewIndex = product.reviews.findIndex(
      (review) => review.user.toString() === userId
    );
    
    if (existingReviewIndex !== -1) {
      // Update existing review
      product.reviews[existingReviewIndex].rating = rating;
      product.reviews[existingReviewIndex].comment = comment;
      product.reviews[existingReviewIndex].timestamp = Date.now();
    } else {
      // Add new review
      product.reviews.push({
        user: userId,
        rating,
        comment,
        timestamp: Date.now(),
      });
    }
    
    await product.save();
    
    // Populate user information in the reviews
    const updatedProduct = await Product.findById(id).populate('reviews.user', 'username');
    
    res.status(200).json({
      message: 'Review added successfully',
      reviews: updatedProduct.reviews,
    });
  } catch (error) {
    next(error);
  }
};

// Get product reviews
exports.getReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id).populate('reviews.user', 'username profile');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Sort reviews by timestamp (newest first)
    const sortedReviews = product.reviews.sort((a, b) => b.timestamp - a.timestamp);
    
    res.status(200).json({
      count: sortedReviews.length,
      reviews: sortedReviews,
    });
  } catch (error) {
    next(error);
  }
};