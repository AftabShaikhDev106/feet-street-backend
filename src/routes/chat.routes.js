const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// All chat routes require authentication
router.use(authMiddleware);

router.get('/', chatController.getChats);
router.get('/:id', chatController.getChatById);
router.post('/', chatController.createChat);
router.get('/:id/messages', chatController.getChatMessages);
router.post('/:id/messages', chatController.sendMessage);

module.exports = router;

// backend/src/socket/chat.handler.js
const Chat = require('../models/chat.model');
const User = require('../models/user.model');

module.exports = (io, socket) => async (data) => {
  try {
    const { chatId, content } = data;
    
    // Find chat
    const chat = await Chat.findById(chatId)
      .populate('participants', 'username profile')
      .exec();
    
    if (!chat) {
      socket.emit('error', { message: 'Chat not found' });
      return;
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === socket.user._id.toString())) {
      socket.emit('error', { message: 'Not authorized to send messages in this chat' });
      return;
    }
    
    // Create new message
    const newMessage = {
      sender: socket.user._id,
      content,
      timestamp: new Date(),
      read: false,
    };
    
    // Add message to chat
    chat.messages.push(newMessage);
    chat.lastMessage = {
      sender: socket.user._id,
      content,
      timestamp: new Date(),
    };
    
    await chat.save();
    
    // Format message for socket response
    const messageResponse = {
      _id: chat.messages[chat.messages.length - 1]._id,
      chatId,
      sender: {
        _id: socket.user._id,
        username: socket.user.username,
        profile: socket.user.profile,
      },
      content,
      timestamp: newMessage.timestamp,
      read: newMessage.read,
    };
    
    // Send message to all participants in the chat room
    io.to(chatId).emit('receive_message', messageResponse);
    
    // Send notification to other participants
    chat.participants.forEach((participant) => {
      if (participant._id.toString() !== socket.user._id.toString()) {
        io.to(participant._id.toString()).emit('new_message', {
          chatId,
          message: {
            sender: {
              _id: socket.user._id,
              username: socket.user.username,
            },
            content: content.length > 30 ? content.substring(0, 30) + '...' : content,
            timestamp: newMessage.timestamp,
          },
        });
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
};
