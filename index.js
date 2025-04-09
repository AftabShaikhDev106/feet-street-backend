// backend/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const walletRoutes = require('./routes/wallet.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const chatRoutes = require('./routes/chat.routes');

// Import middlewares
const { errorHandler } = require('./middlewares/error.middleware');
const { socketAuthMiddleware } = require('./middlewares/auth.middleware');

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
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/chats', chatRoutes);

// Error handler middleware
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