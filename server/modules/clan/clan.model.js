const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
    },
    emblem: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    members: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        role: {
          type: String,
          enum: ['leader', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalXP: {
      type: Number,
      default: 0,
    },
    weeklyXP: {
      type: Number,
      default: 0,
    },
    weekStart: {
      type: Date,
      default: null,
    },
    rank: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    activeBattle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClanBattle',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

clanSchema.index({ schoolName: 1 });
clanSchema.index({ totalXP: -1 });
clanSchema.index({ weeklyXP: -1 });

module.exports = mongoose.model('Clan', clanSchema);
