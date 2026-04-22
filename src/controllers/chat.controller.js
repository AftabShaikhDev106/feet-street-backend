const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');

// Get all chats for a user
exports.getChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find all chats where user is a participant

    console.log("aya")

    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'username profile')
      .populate('product', 'title images price status')
      .sort({ updatedAt: -1 })
      .exec();
    
    res.status(200).json({
      count: chats.length,
      chats,
    });
  } catch (error) {
    next(error);
  }
};

// Get chat by ID
exports.getChatById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find chat by ID
    const chat = await Chat.findById(id)
      .populate('participants', 'username profile')
      .populate('product', 'title images price status')
      .exec();
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    res.status(200).json({
      chat,
    });
  } catch (error) {
    next(error);
  }
};

// Create new chat
exports.createChat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { participantId, productId } = req.body;


    
    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Check if product exists if provided
    let product = null;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
    }
    
    // Check if chat already exists between these users for this product
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
      ...(productId ? { product: productId } : {}),
    })
      .populate('participants', 'username profile')
      .populate('product', 'title images price status')
      .exec();
    
    if (existingChat) {
      return res.status(200).json({
        message: 'Chat already exists',
        chat: existingChat,
      });
    }
    
    // Create new chat
    const chat = new Chat({
      participants: [userId, participantId],
      product: productId,
      messages: [],
    });
    
    await chat.save();
    
    // Populate participants and product
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username profile')
      .populate('product', 'title images price status')
      .exec();
    
    res.status(201).json({
      message: 'Chat created successfully',
      chat: populatedChat,
    });
  } catch (error) {
    next(error);
  }
};

// Get chat messages
exports.getChatMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find chat by ID
    const chat = await Chat.findById(id)
      .populate({
        path: 'messages.sender',
        select: 'username profile',
      })
      .exec();
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    // Mark unread messages as read
    chat.messages.forEach((message) => {
      if (message.sender._id.toString() !== userId && !message.read) {
        message.read = true;
      }
    });
    
    await chat.save();
    
    res.status(200).json({
      count: chat.messages.length,
      messages: chat.messages,
    });
  } catch (error) {
    next(error);
  }
};

// Send message
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;
    
    // Find chat by ID
    const chat = await Chat.findById(id).exec();
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p.toString() === userId)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }
    
    // Create new message
    const newMessage = {
      sender: userId,
      content,
      timestamp: new Date(),
      read: false,
    };
    
    // Add message to chat
    chat.messages.push(newMessage);
    chat.lastMessage = {
      sender: userId,
      content,
      timestamp: new Date(),
    };
    
    await chat.save();
    
    // Populate sender info for the new message
    const populatedMessage = {
      ...newMessage.toObject(),
      sender: {
        _id: req.user._id,
        username: req.user.username,
        profile: req.user.profile,
      },
    };
    
    res.status(201).json({
      message: 'Message sent successfully',
      chat: chat._id,
      newMessage: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};