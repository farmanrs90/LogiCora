const mongoose = require('mongoose');

const eloHistorySchema = new mongoose.Schema(
  {
    opponentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    result: {
      type: String,
      enum: ['win', 'loss', 'draw'],
      required: true,
    },
    ratingChange: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const eloSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: String,
      enum: ['general', 'math', 'logic', 'language', 'science'],
      default: 'general',
    },
    rating: {
      type: Number,
      default: 1200,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    history: {
      type: [eloHistorySchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

eloSchema.index({ studentId: 1, subject: 1 }, { unique: true });
eloSchema.index({ subject: 1, rating: -1 });

module.exports = mongoose.model('EloRating', eloSchema);
