const User = require('../user/user.model');
const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');
const Parent = require('../parent/parent.model');
const Gamification = require('../gamification/gamification.model');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateToken');
const { createDefaultForNewUser } = require('../accessibility/accessibility.service');
const centerService = require('../center/center.service');

// Creates the role-specific profile right after the User is created.
// Without it, a student has no Student/Gamification doc, so quiz & XP endpoints 404.
// `center` (opsional) yalnız müəllim üçün — valid joinCode ilə tapılmış EducationCenter.
const createRoleProfile = async (user, center = null) => {
  if (user.role === 'student') {
    const student = await Student.create({ userId: user._id, grade: 1 });
    await Gamification.create({ studentId: student._id });
  } else if (user.role === 'teacher') {
    // `specialization` is a required enum on the Teacher model — default to 'other'.
    await Teacher.create({
      userId: user._id,
      specialization: 'other',
      educationCenterId: center ? center._id : null,
      centerJoinStatus: center ? 'active' : 'independent',
    });
  } else if (user.role === 'parent') {
    await Parent.create({ userId: user._id });
  }
  // admin / manager need no extra profile
};

// İstifadə şərtlərinin cari MVP versiyası — frontend versiya göndərməsə fallback.
const TERMS_VERSION = '2026.06-mvp';

const registerUser = async (payload) => {
  const { name, surname, email, phone, password, role, ageGroup, termsVersion, centerJoinCode } = payload;

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

  // Müəllim + mərkəz kodu: USER yaratmazdan ƏVVƏL kodu yoxla ki, yanlış kodda orphan user qalmasın.
  // Kod yalnız müəllim üçün nəzərə alınır; digər rollar üçün tamamilə iqnor edilir.
  let center = null;
  if (role === 'teacher' && centerJoinCode && String(centerJoinCode).trim()) {
    center = await centerService.findActiveByJoinCode(centerJoinCode);
    if (!center) {
      const error = new Error('Təhsil mərkəzi kodu düzgün deyil.');
      error.statusCode = 400;
      throw error;
    }
  }

  const hashed = await hashPassword(password);
  // termsAccepted Joi-də artıq true kimi təsdiqlənib — burada qəbul vaxtını real yazırıq.
  const created = await User.create({
    name,
    surname,
    email,
    phone,
    password: hashed,
    role: role || 'student',
    ageGroup,
    termsAccepted: true,
    termsAcceptedAt: new Date(),
    termsVersion: termsVersion || TERMS_VERSION,
  });

  // Create the matching role profile (Student+Gamification / Teacher / Parent)
  // Müəllim üçün tapılmış mərkəz (varsa) profilə bağlanır.
  await createRoleProfile(created, center);

  const tokenPayload = { id: created._id, role: created.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await User.findByIdAndUpdate(created._id, { refreshToken });
  await createDefaultForNewUser(created._id);

  return {
    accessToken,
    refreshToken,
    user: {
      _id: created._id,
      name: created.name,
      surname: created.surname,
      email: created.email,
      phone: created.phone,
      role: created.role,
      ageGroup: created.ageGroup,
      characterType: created.characterType,
      profileCompleted: created.profileCompleted,
    },
  };
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const found = await User.findOne({ email: normalizedEmail }).select('+password');
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
      _id: found._id,
      name: found.name,
      surname: found.surname,
      email: found.email,
      phone: found.phone,
      role: found.role,
      ageGroup: found.ageGroup,
      characterType: found.characterType,
      profileCompleted: found.profileCompleted,
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
const completeOnboarding = async (userId, payload) => {
  const { name, ageGroup, characterType, knowledgeLevel } = payload;

  // 1) User-i yenilə + onboarding-i bitmiş kimi işarələ
  const user = await User.findByIdAndUpdate(
    userId,
    { name, ageGroup, characterType, profileCompleted: true },
    { new: true }
  );
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // 2) knowledgeLevel yalnız tələbə profilinə yazılır
  if (user.role === 'student') {
    await Student.findOneAndUpdate({ userId: user._id }, { knowledgeLevel });
  }

  return {
    _id: user._id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ageGroup: user.ageGroup,
    characterType: user.characterType,
    profileCompleted: user.profileCompleted,
  };
};


module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  completeOnboarding,
};
