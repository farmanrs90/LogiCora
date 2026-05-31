const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'KidsVideo', required: true },
  watched: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  questionsCorrect: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  correctQuestions: { type: [Number], default: [] }, // artıq doğru cavablanmış sual indeksləri (təkrar XP-nin qarşısını alır)

}, { timestamps: true, versionKey: false });

// Bir user × bir video → tək qeyd
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('KidsProgress', progressSchema);
