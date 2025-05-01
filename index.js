// backend/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const wishlistRoutes = require('./src/routes/wishlist.routes');
const chatRoutes = require('./src/routes/chat.routes');

// Import middlewares
const { errorHandler,notFound } = require('./src/middlewares/error.middleware');
const { socketAuthMiddleware } = require('./src/middlewares/auth.middleware');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// To this:
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global error handler middleware (must be last!)
app.use(errorHandler);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/chats', chatRoutes);

// Error handler middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io setup
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  console.log('User connected:', socket.user._id);
  
  // Join user's personal room
  socket.join(socket.user._id.toString());
  
  // Handle chat events
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.user._id} joined chat: ${chatId}`);
  });
  
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.user._id} left chat: ${chatId}`);
  });
  
  socket.on('send_message', require('./socket/chat.handler')(io, socket));
  
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('typing', {
      userId: socket.user._id,
      chatId: data.chatId,
    });
  });
  
  socket.on('stop_typing', (data) => {
    socket.to(data.chatId).emit('stop_typing', {
      userId: socket.user._id,
      chatId: data.chatId,
    });
  });
  
  // Disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user?._id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});