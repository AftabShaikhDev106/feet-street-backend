const User = require('../models/user.model');

// Get wallet balance
exports.getBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      balance: user.wallet.balance,
    });
  } catch (error) {
    next(error);
  }
};

// Get wallet transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sort transactions by timestamp in descending order (newest first)
    const transactions = user.wallet.transactions.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.status(200).json({
      wallet: user.wallet,
      transactions: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// Top up wallet
exports.topUpWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    
    // Validate amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create transaction record
    const transaction = {
      amount: parsedAmount,
      type: 'credit',
      description: 'Wallet top up',
      timestamp: new Date(),
    };
    
    // Update user wallet
    user.wallet.balance += parsedAmount;
    user.wallet.transactions.push(transaction);
    
    await user.save();
    
    res.status(200).json({
      message: 'Wallet topped up successfully',
      wallet: user.wallet,
      transaction: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// Handle wallet deduction for purchases
exports.deductFromWallet = async (userId, amount, description) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user has sufficient balance
    if (user.wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Create transaction record
    const transaction = {
      amount: amount,
      type: 'debit',
      description: description,
      timestamp: new Date(),
    };
    
    // Update user wallet
    user.wallet.balance -= amount;
    user.wallet.transactions.push(transaction);
    
    await user.save();
    
    return {
      success: true,
      wallet: user.wallet,
      transaction: transaction,
    };
  } catch (error) {
    throw error;
  }
};