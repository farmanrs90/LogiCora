const User = require('../user/user.model');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAccessToken } = require('../../utils/generateToken');

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

  const token = generateAccessToken({ id: created._id, role: created.role });

  return {
    token,
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

  const token = generateAccessToken({ id: found._id, role: found.role });

  return {
    token,
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

module.exports = {
  registerUser,
  loginUser,
};