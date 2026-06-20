const mongoose = require('mongoose');

// Təhsil Mərkəzi MÜRACİƏTİ — istifadəçi göndərir, admin təsdiqləyir.
// Təsdiqdən sonra real EducationCenter yaranır (createdCenterId).
const centerApplicationSchema = new mongoose.Schema(
  {
    applicantUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Müraciət anındakı snapshot-lar (sonradan dəyişsə belə tarixçə qalsın)
    applicantRole: { type: String, default: '' },
    applicantName: { type: String, default: '' },
    applicantEmail: { type: String, default: '' },

    centerName: { type: String, required: true, trim: true },
    // Müraciət növü — VÖEN-siz fərdi müəllim/kiçik qrup da müraciət edə bilər.
    centerType: {
      type: String,
      enum: ['individual_teacher', 'course_center', 'school_or_org'],
      default: 'individual_teacher',
    },
    // VÖEN/sənəd RƏSMİ TƏSDİQ üçün tövsiyə olunur, məcburi deyil.
    taxIdOrVoen: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    contactName: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, default: '' },
    description: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: '' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    createdCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EducationCenter',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

centerApplicationSchema.index({ applicantUser: 1, status: 1 });
centerApplicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CenterApplication', centerApplicationSchema);
