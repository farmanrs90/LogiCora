const User = require('../user/user.model');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateToken');
const { createDefaultForNewUser } = require('../accessibility/accessibility.service');

const registerUser = async (payload) => {
  const { name, surname, email, phone, password, role, ageGroup } = payload;

  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const existingByPhone = await User.findOne({ phone });
  if (existingByPhone) {
    const error = new Error('Phone already in use');
    error.statusCode = 409;
    throw error;
  }

  const hashed = await hashPassword(password);
  const created = await User.create({
    name,
    surname,
    email,
    phone,
    password: hashed,
    role: role || 'student',
    ageGroup,
  });

  const tokenPayload = { id: created._id, role: created.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await User.findByIdAndUpdate(created._id, { refreshToken });
  await createDefaultForNewUser(created._id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: created._id,
      name: created.name,
      surname: created.surname,
      email: created.email,
      phone: created.phone,
      role: created.role,
      ageGroup: created.ageGroup,
    },
  };
};

const loginUser = async ({ email, password }) => {
  const found = await User.findOne({ email }).select('+password');
  if (!found) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const ok = await comparePassword(password, found.password);
  if (!ok) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const tokenPayload = { id: found._id, role: found.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await User.findByIdAndUpdate(found._id, { refreshToken });

  return {
    accessToken,
    refreshToken,
    user: {
      id: found._id,
      name: found.name,
      surname: found.surname,
      email: found.email,
      phone: found.phone,
      role: found.role,
      ageGroup: found.ageGroup,
    },
  };
};

const refreshAccessToken = async (token) => {
  const jwt = require('jsonwebtoken');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    const error = new Error('Refresh token revoked');
    error.statusCode = 401;
    throw error;
  }

  const tokenPayload = { id: user._id, role: user.role };
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
};
