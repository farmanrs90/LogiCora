const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      enum: ['mathematics', 'language', 'science', 'history', 'physical_education', 'art', 'music', 'other'],
      required: true,
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    experience: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      default: '',
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    canPublish: {
      type: Boolean,
      default: false,
    },

    // Showcase / Storefront fields
    displayName: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    introVideo: {
      type: String,
      default: null,
    },
    socialLinks: {
      youtube: { type: String, default: null },
      linkedin: { type: String, default: null },
      instagram: { type: String, default: null },
      website: { type: String, default: null },
    },
    achievements: {
      type: [String],
      default: [],
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    impactScore: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      select: false,
    },

    // Center fields
    centerName: {
      type: String,
      default: null,
    },
    centerLogo: {
      type: String,
      default: null,
    },
    teamMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          default: 'teacher',
        },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

teacherSchema.index({ isFeatured: 1, featuredUntil: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);
