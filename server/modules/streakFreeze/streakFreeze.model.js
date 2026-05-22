const mongoose = require('mongoose');

const freezeHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['bought', 'used'],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    gemsCost: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const streakFreezeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    freezesOwned: {
      type: Number,
      default: 0,
      min: 0,
    },
    freezesUsed: {
      type: Number,
      default: 0,
    },
    activeUntil: {
      type: Date,
      default: null,
    },
    history: {
      type: [freezeHistorySchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('StreakFreeze', streakFreezeSchema);
