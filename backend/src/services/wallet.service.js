const walletRepo = require('../repositories/wallet.repository');

exports.getWalletBalance = async (userId) => {
  const wallet = await walletRepo.getWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");
  return wallet;
};

exports.deposit = async (userId, amount) => {
  if (amount <= 0) throw new Error("Deposit amount must be greater than 0");
  
  let wallet = await walletRepo.getWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");

  await walletRepo.deposit(wallet.id, amount);
  return await walletRepo.getWalletByUserId(userId);
};

exports.withdraw = async (userId, amount) => {
  if (amount <= 0) throw new Error("Withdraw amount must be greater than 0");
  
  let wallet = await walletRepo.getWalletByUserId(userId);
  if (!wallet) throw new Error("Wallet not found");

  return await walletRepo.withdraw(wallet.id, amount);
};
