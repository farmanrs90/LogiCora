const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    occupation: {
      type: String,
      default: '',
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Parent', parentSchema);