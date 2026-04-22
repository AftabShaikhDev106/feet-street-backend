const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Authentication middleware for REST APIs
exports.authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Authentication middleware for Socket.io
// src/middlewares/auth.middleware.js

// Socket middleware
exports.socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    
    // Remove 'Bearer ' if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Verify token
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    return next(new Error('Authentication error: ' + error.message));
  }
};