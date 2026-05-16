const mongoose = require('mongoose');

const xpHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: ['assessment', 'streak_bonus'],
      required: true,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true, versionKey: false }
);

xpHistorySchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('XpHistory', xpHistorySchema);