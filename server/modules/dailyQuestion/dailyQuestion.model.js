const mongoose = require('mongoose');

const dailyQuestionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
    },
    // YYYY-MM-DD string for fast daily lookups without time zone issues
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound index: one user's answers per day, fast duplicate check
dailyQuestionSchema.index({ userId: 1, date: 1 });
dailyQuestionSchema.index({ userId: 1, questionId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyQuestion', dailyQuestionSchema);
