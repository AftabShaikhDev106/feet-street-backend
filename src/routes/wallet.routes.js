const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// All wallet routes require authentication
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/topup', walletController.topUpWallet);

module.exports = router;