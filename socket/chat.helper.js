const Chat = require('../src/models/chat.model');
const User = require('../src/models/user.model');
const { sendNotification } = require('../src/utils/notification.utils');

// Handler for sending messages
module.exports = function(io, socket) {
  return async function(data) {
    try {
      const { chatId, content } = data;
      
      if (!chatId || !content) {
        socket.emit('error', { message: 'Chat ID and message content are required' });
        return;
      }
      
      // Get the user ID from the socket (set by the auth middleware)
      const userId = socket.user._id;
      
      // Create a new message
      const newMessage = {
        sender: userId,
        content: content,
        timestamp: new Date(),
        read: false
      };
      
      // Update the chat with the new message
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: { messages: newMessage },
          lastMessage: {
            sender: userId,
            content: content,
            timestamp: new Date()
          }
        },
        { new: true }
      ).populate({
        path: 'participants',
        select: 'username profile.profileImage'
      });
      
      if (!updatedChat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }
      
      // Get the newly added message
      const messageIndex = updatedChat.messages.length - 1;
      const populatedMessage = updatedChat.messages[messageIndex];
      
      // Emit the message to everyone in the chat room
      io.to(chatId).emit('message_received', {
        _id: populatedMessage._id,
        sender: { 
          _id: populatedMessage.sender,
          username: socket.user.username,
          profileImage: socket.user.profile?.profileImage
        },
        content: populatedMessage.content,
        timestamp: populatedMessage.timestamp,
        read: populatedMessage.read
      });
      
      // Emit an event to notify participants
      updatedChat.participants.forEach(async (participant) => {
        if (participant._id.toString() !== userId.toString()) {
          // Send real-time notification via utility (persists to DB and emits 'new_notification')
          await sendNotification(io, {
            recipient: participant._id,
            sender: userId,
            type: 'message',
            title: `New message from ${socket.user.username}`,
            message: content.length > 50 ? content.substring(0, 47) + '...' : content,
            data: { chatId, messageId: populatedMessage._id }
          });

          io.to(participant._id.toString()).emit('new_message_notification', {
            chatId,
            message: {
              _id: populatedMessage._id,
              sender: { 
                _id: populatedMessage.sender,
                username: socket.user.username,
                profileImage: socket.user.profile?.profileImage
              },
              content: populatedMessage.content,
              timestamp: populatedMessage.timestamp
            },
            chat: {
              _id: updatedChat._id,
              participants: updatedChat.participants,
              product: updatedChat.product
            }
          });
        }
      });
      
      console.log(`Message sent in chat ${chatId} by user ${userId}`);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  };
};