const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');

// Get user's wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find user's wishlist or create if not exists
    let wishlist = await Wishlist.findOne({ user: userId })
      .populate({
        path: 'products',
        select: 'title brand images price status',
        match: { status: 'available' },
      })
      .exec();
    
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        products: [],
      });
      await wishlist.save();
    }
    
    // Filter out any null values from populated products (if product was deleted or status not 'available')
    wishlist.products = wishlist.products.filter(product => product);
    
    res.status(200).json({
      count: wishlist.products.length,
      products: wishlist.products,
    });
  } catch (error) {
    next(error);
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find user's wishlist or create if not exists
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        products: [],
      });
    }
    
    // Check if product is already in wishlist
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }
    
    // Add product to wishlist
    wishlist.products.push(productId);
    await wishlist.save();
    
    // Also update the user's wishlist array for convenience
    await User.findByIdAndUpdate(userId, { $addToSet: { wishlist: productId } });
    
    res.status(200).json({
      message: 'Product added to wishlist',
      wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    // Find user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Remove product from wishlist
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );
    await wishlist.save();
    
    // Also update the user's wishlist array for convenience
    await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
    
    res.status(200).json({
      message: 'Product removed from wishlist',
      wishlist,
    });
  } catch (error) {
    next(error);
  }
};