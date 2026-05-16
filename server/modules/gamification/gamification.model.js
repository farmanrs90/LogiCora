const mongoose = require('mongoose');

const gamificationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    totalXP: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActivityDate: {
      type: Date,
      default: null,
    },
    weeklyXP: {
      type: Number,
      default: 0,
    },
    weekStart: {
      type: Date,
      default: null,
    },
    leagueTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
    },
    badges: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Gamification', gamificationSchema);
