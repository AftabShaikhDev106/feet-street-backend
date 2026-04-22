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
