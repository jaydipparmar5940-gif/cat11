const walletService = require('../services/wallet.service');

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await walletService.getWalletBalance(userId);
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    console.error('[WALLET CTRL] getWallet error:', error);
    if (error.message === 'Wallet not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Error fetching wallet", error: error.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }

    const wallet = await walletService.deposit(userId, amount);
    res.status(200).json({ success: true, message: "Deposit successful", wallet });
  } catch (error) {
    if (error.message === 'Wallet not found') {
      return res.status(404).json({ message: error.message });
    }
    console.error('[WALLET CTRL] deposit error:', error);
    res.status(500).json({ message: "Error processing deposit", error: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdraw amount" });
    }

    const wallet = await walletService.withdraw(userId, amount);
    res.status(200).json({ success: true, message: "Withdraw successful", wallet });
  } catch (error) {
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Wallet not found') {
      return res.status(404).json({ message: error.message });
    }
    console.error('[WALLET CTRL] withdraw error:', error);
    res.status(500).json({ message: "Error processing withdraw", error: error.message });
  }
};
