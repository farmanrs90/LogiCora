const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answer:       { type: String, default: '' },
    explanation:  { type: String, default: '' },
    responseTime: { type: Number, default: 0 },
    isCorrect:    { type: Boolean, default: false },
    submittedAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const weeklyMysterySchema = new mongoose.Schema(
  {
    text:          { type: String, required: true, trim: true },
    correctAnswer: { type: String, required: true, select: false }, // gizli
    difficulty:    { type: String, enum: ['hard', 'legendary'], default: 'hard' },
    weekNumber:    { type: Number, required: true },
    status:        { type: String, enum: ['waiting', 'active', 'solved'], default: 'active' },
    revealedAt:    { type: Date, default: Date.now },
    endsAt:        { type: Date, default: null },
    attempts:      [attemptSchema],
    winner: {
      userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name:            { type: String, default: '' },
      city:            { type: String, default: '' },
      avatarColor:     { type: String, default: '#9333EA' },
      solvedInMinutes: { type: Number, default: 0 },
      solvedAt:        { type: Date, default: null },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('WeeklyMystery', weeklyMysterySchema);
