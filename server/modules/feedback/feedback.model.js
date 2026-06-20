const mongoose = require('mongoose');

const CATEGORIES = ['ui', 'lesson', 'teacher', 'payment', 'technical', 'accessibility', 'suggestion', 'other'];
const TYPES = ['suggestion', 'complaint', 'bug', 'improvement'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['new', 'reviewing', 'resolved', 'rejected'];
const ROLES = ['student', 'teacher', 'parent', 'admin', 'manager'];

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Göndərən anındakı rol — req.user-dən snapshot (client göndərmir).
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    type: {
      type: String,
      enum: TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'new',
    },
    adminNote: {
      type: String,
      default: '',
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Validation/service-də təkrar istifadə üçün enum dəyərlərini ixrac edirik.
Feedback.CATEGORIES = CATEGORIES;
Feedback.TYPES = TYPES;
Feedback.PRIORITIES = PRIORITIES;
Feedback.STATUSES = STATUSES;
Feedback.ROLES = ROLES;

module.exports = Feedback;
