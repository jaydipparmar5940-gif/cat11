const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cat11_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const prisma = require('../utils/prisma');

router.get('/', authMiddleware, walletController.getWallet);
router.post('/deposit', authMiddleware, walletController.deposit);
router.post('/withdraw', authMiddleware, walletController.withdraw);

// ✅ GET WALLET BY ID (Production Refinement)
router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const wallet = await prisma.userWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: "User wallet not found" });
    }

    // Returning exact requested JSON format
    res.json({
      userId: wallet.userId,
      balance: parseFloat(wallet.balance)
    });

  } catch (error) {
    console.error(`[WALLET API ERROR]: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
