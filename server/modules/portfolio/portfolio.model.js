const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    timeline: [
      {
        date: {
          type: Date,
          required: true,
        },
        type: {
          type: String,
          enum: ['course', 'competition', 'badge', 'achievement', 'attendance'],
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: '',
        },
        xpEarned: {
          type: Number,
          default: 0,
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    skillTree: [
      {
        subject: {
          type: String,
          required: true,
        },
        level: {
          type: Number,
          default: 1,
        },
        xp: {
          type: Number,
          default: 0,
        },
      },
    ],
    totalCourses: {
      type: Number,
      default: 0,
    },
    totalCompetitions: {
      type: Number,
      default: 0,
    },
    topSubject: {
      type: String,
      default: null,
    },
    shareableLink: {
      type: String,
      unique: true,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
