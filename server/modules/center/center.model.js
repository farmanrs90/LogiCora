const mongoose = require('mongoose');

// Təhsil Mərkəzi (təşkilat). Müəllim = insan; Kurs = öyrənmə məhsulu; Mərkəz = təşkilat.
const educationCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    // Müəllim mərkəzə bu kodla qoşulur — unikal və məcburidir.
    joinCode: { type: String, required: true, unique: true, trim: true },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('EducationCenter', educationCenterSchema);
