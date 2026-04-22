// src/controllers/user.controller.js
const User = require('../models/user.model');
const Product = require('../models/product.model');

// Get user profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      phoneNumber,
      address,
      city,
      state,
      pincode,
      profileImage
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    user.profile = {
      fullName: fullName || user.profile?.fullName,
      phoneNumber: phoneNumber || user.profile?.phoneNumber,
      address: address || user.profile?.address,
      city: city || user.profile?.city,
      state: state || user.profile?.state,
      pincode: pincode || user.profile?.pincode,
      profileImage: profileImage || user.profile?.profileImage
    };

    // Check if profile is complete
    const isProfileComplete = !!(
      user.profile.fullName && 
      user.profile.phoneNumber && 
      user.profile.address && 
      user.profile.city && 
      user.profile.state && 
      user.profile.pincode
    );
    
    user.profileCompleted = isProfileComplete;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// Get user listings
exports.getUserListings = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const products = await Product.find({ seller: id })
      .sort({ createdAt: -1 })
      .exec();
    
    res.status(200).json({
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// Get user reviews
exports.getUserReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find all products by this user
    const products = await Product.find({ seller: id });
    
    // Extract all reviews from these products
    const reviews = [];
    products.forEach(product => {
      product.reviews.forEach(review => {
        reviews.push({
          ...review.toObject(),
          product: {
            _id: product._id,
            title: product.title,
            images: product.images
          }
        });
      });
    });
    
    // Sort by newest first
    reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.status(200).json({
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

const cloudinary = require('../config/cloudinary');

// Upload profile image
exports.uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    // Convert buffer to data URI
    const fileBase64 = req.file.buffer.toString('base64');
    const fileUri = `data:${req.file.mimetype};base64,${fileBase64}`;
    
    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(fileUri, {
      folder: 'feet_street/profiles',
      resource_type: 'image',
    });
    
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.log('Profile image upload error:', error);
    next(error);
  }
};

module.exports = exports;