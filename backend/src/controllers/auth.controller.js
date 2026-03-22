const authService = require('../services/auth.service');

exports.signup = async (req, res) => {
  try {
    const { user, token } = await authService.signup(req.body);
    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('[SIGNUP ERROR]', error);
    let status = 500;
    if (error.message.includes("required") || error.message.includes("match") || error.message.includes("exists")) {
      status = 400;
    }
    res.status(status).json({ message: status === 500 ? "Error during signup" : error.message, error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    let status = 500;
    if (error.message.includes("required")) status = 400;
    if (error.message.includes("Invalid")) status = 401;
    res.status(status).json({ message: status === 500 ? "Error during login" : error.message, error: error.message });
  }
};
