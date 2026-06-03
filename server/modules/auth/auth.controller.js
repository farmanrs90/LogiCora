const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(201).json({ success: true, data, message: 'User registered successfully' });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await authService.loginUser(req.body);
    return res.status(200).json({ success: true, data, message: 'Login successful' });
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({ success: true, data, message: 'Token refreshed' });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user.id);
    return res.status(200).json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
};
const completeOnboarding = async (req, res, next) => {
  try {
    const data = await authService.completeOnboarding(req.user.id, req.body);
    return res.status(200).json({ success: true, data, message: 'Onboarding completed' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, refresh, logout, completeOnboarding };


