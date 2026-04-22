const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const walletController = require('../controllers/wallet.controller');
const { sendNotification } = require('../utils/notification.utils');

// Get all orders for user
exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get orders where user is either buyer or seller
    const orders = await Order.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate('product', 'title images price')
      .populate('buyer', 'username profile')
      .populate('seller', 'username profile')
      .sort({ createdAt: -1 })
      .exec();
    
    res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const order = await Order.findById(id)
      .populate('product', 'title description brand category size condition images price')
      .populate('buyer', 'username profile')
      .populate('seller', 'username profile')
      .exec();
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user is buyer or seller
    if (order.buyer._id.toString() !== userId && order.seller._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }
    
    res.status(200).json({
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Create new order
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, deliveryAddress } = req.body;
    
    // Check if user has completed profile
    if (!req.user.profileCompleted) {
      return res.status(403).json({
        message: 'Please complete your profile before placing an order',
      });
    }
    
    // Get product info
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product is available
    if (product.status !== 'available') {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }
    
    // Check if user is not the seller
    if (product.seller.toString() === userId) {
      return res.status(400).json({ message: 'You cannot buy your own product' });
    }
    
    // Deduct money from wallet
    try {
      const deductResult = await walletController.deductFromWallet(
        userId, 
        product.price, 
        `Purchase of ${product.title}`
      );
      
      if (!deductResult.success) {
        return res.status(400).json({ message: deductResult.message || 'Failed to process payment' });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message || 'Insufficient wallet balance' });
    }
    
    // Create new order
    const order = new Order({
      buyer: userId,
      seller: product.seller,
      product: productId,
      price: product.price,
      status: 'pending',
      deliveryAddress,
    });
    
    await order.save();
    
    // Update product status
    product.status = 'sold';
    await product.save();

    // Send Notification to Seller
    const io = req.app.get('io');
    await sendNotification(io, {
      recipient: product.seller,
      sender: userId,
      type: 'order_placed',
      title: 'New Order Received',
      message: `You have received a new order for "${product.title}"`,
      data: { orderId: order._id, productId }
    });
    
    // Populate order details for response
    const populatedOrder = await Order.findById(order._id)
      .populate('product', 'title images price')
      .populate('buyer', 'username profile')
      .populate('seller', 'username profile')
      .exec();
    
    res.status(201).json({
      message: 'Order placed successfully',
      order: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Update order status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findById(id).populate('product', 'title');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only seller can update order status
    if (order.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }
    
    // Update order status
    order.status = status;
    await order.save();

    // Send Notification to Buyer
    const io = req.app.get('io');
    await sendNotification(io, {
      recipient: order.buyer,
      sender: userId,
      type: 'order_status',
      title: 'Order Status Updated',
      message: `Your order for "${order.product.title}" is now ${status}`,
      data: { orderId: order._id, status }
    });
    
    res.status(200).json({
      message: 'Order status updated successfully',
      order,
    });
  } catch (error) {
    next(error);
  }
};
