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
      enum: ['3-5', '6-8', '9-11', '12-14', '15-17'],
      required: true,
    },
    isSpecialNeeds: { type: Boolean, default: false },
    specialNeedsType: {
      type: String,
      enum: ['physical', 'cognitive', 'emotional', 'sensory', 'autism', 'other', ''],
      default: '',
    },
    school: { type: String, default: '' },
    parentName: { type: String, default: '' },
    parentContact: { type: String, default: '' },
    profileCompleted: { type: Boolean, default: false },
    hobbies: { type: [String], default: [] },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    isPhoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);