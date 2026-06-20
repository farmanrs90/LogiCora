const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    surname: { type: String, default: '', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin', 'parent', 'manager'],
      default: 'student',
    },
    phone: { type: String, required: true, unique: true, trim: true },
    ageGroup: {
      type: String,
      enum: ['3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+'],
      required: true,
    },
    isSpecialNeeds: { type: Boolean, default: false },
    specialNeedsType: {
      type: String,
      enum: ['physical', 'cognitive', 'emotional', 'sensory', 'autism', 'other', ''],
      default: '',
    },
    profileCompleted: { type: Boolean, default: false },
    // İstifadə şərtlərinin qəbulu — yalnız yeni qeydiyyatda təyin olunur.
    // Köhnə/seed/admin istifadəçilər üçün default false, tələb olunmur → login-ə təsir etmir.
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
    termsVersion: { type: String, default: '' },
    characterType: {
      type: String,
      enum: ['fast-thinker', 'deep-analyst', 'creative-explorer', null],
      default: null,
    },
    hobbies: { type: [String], default: [] },
    isPhoneVerified: { type: Boolean, default: false },
    lastLoginDate: { type: Date, default: null },
    language: {
      type: String,
      enum: ['az', 'ru', 'en'],
      default: 'az',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
