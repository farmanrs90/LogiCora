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
    // Mərkəz növü (müraciətdən miras alınır).
    centerType: {
      type: String,
      enum: ['individual_teacher', 'course_center', 'school_or_org'],
      default: 'course_center',
    },
    // Təsdiq səviyyəsi: VÖEN/sənədsiz təsdiqlər 'basic', sənədli + admin təsdiqi 'verified'.
    // Fake verification yoxdur — 'verified' yalnız real sənəd olduqda təyin olunur.
    verificationLevel: {
      type: String,
      enum: ['basic', 'verified'],
      default: 'basic',
    },
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
