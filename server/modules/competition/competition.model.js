const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    score: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalAnswers: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    responseTime: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false }
);

const competitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        timeLimit: { type: Number, default: 30 },
        points: { type: Number, default: 100 },
      },
    ],
    participants: [participantSchema],
    answers: [answerSchema],
    status: {
      type: String,
      enum: ['waiting', 'active', 'finished'],
      default: 'waiting',
    },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    pin: { type: String, unique: true },
  },
  { timestamps: true, versionKey: false }
);

competitionSchema.index({ pin: 1 });
competitionSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('Competition', competitionSchema);
