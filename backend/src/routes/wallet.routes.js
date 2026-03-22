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

// ✅ GET WALLET BY USER ID
router.get("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const wallet = await prisma.userWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json(wallet);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
