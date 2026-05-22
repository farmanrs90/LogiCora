const mongoose = require('mongoose');

const clanBattleSchema = new mongoose.Schema(
  {
    challengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clan',
      required: true,
    },
    challengedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clan',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'finished'],
      default: 'pending',
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      default: null,
    },
    challengerScore: {
      type: Number,
      default: 0,
    },
    challengedScore: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clan',
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

clanBattleSchema.index({ challengerId: 1, status: 1 });
clanBattleSchema.index({ challengedId: 1, status: 1 });
clanBattleSchema.index({ status: 1 });

module.exports = mongoose.model('ClanBattle', clanBattleSchema);
