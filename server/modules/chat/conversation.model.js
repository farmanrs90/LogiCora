const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    messages: {
      type: [messageSchema],
      default: [],
    },
    lastMessage: {
      type: String,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
