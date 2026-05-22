const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    resources: {
      type: [String],
      default: [],
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

lessonSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
