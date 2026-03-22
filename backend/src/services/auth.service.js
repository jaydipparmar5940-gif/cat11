const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepo = require('../repositories/auth.repository');

exports.signup = async ({ name, email, phone, password, confirm_password }) => {
  if (!name || !email || !password) {
    throw new Error("Name, email and password are required");
  }

  if (password !== confirm_password) {
    throw new Error("Passwords do not match");
  }

  const existing = await authRepo.findUserByEmail(email);
  if (existing) {
    throw new Error("User already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await authRepo.createUser(name, email, phone || null, hashedPassword);

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cat11_secret', { expiresIn: '7d' });
  return { user, token };
};

exports.login = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'cat11_secret', { expiresIn: '7d' });
  return { user, token };
};
