const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    grade: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    school: {
      type: String,
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
      default: null,
    },
    interests: {
      type: [String],
      default: [],
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'reading_writing'],
      default: 'visual',
    },
    progress: [
      {
        assessmentId: mongoose.Schema.Types.ObjectId,
        score: Number,
        timeSpent: Number,
        completedAt: Date,
      },
    ],
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    badges: [String],
    enrolledGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Student', studentSchema);