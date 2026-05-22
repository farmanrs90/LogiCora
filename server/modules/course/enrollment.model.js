const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedLessons: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Lesson',
      default: [],
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    certificateUrl: {
      type: String,
      default: null,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ courseId: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
