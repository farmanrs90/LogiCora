const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    centerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    thumbnail: {
      type: String,
      default: null,
    },
    previewVideo: {
      type: String,
      default: null,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    language: {
      type: String,
      enum: ['az', 'ru', 'en'],
      default: 'az',
    },
    ageGroup: {
      type: [String],
      enum: ['3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+'],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    whatYouLearn: {
      type: [String],
      default: [],
    },
    requirements: {
      type: [String],
      default: [],
    },
    targetAudience: {
      type: String,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },
    totalEnrolled: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    certificate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

courseSchema.index({ teacherId: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isPublished: 1, isFeatured: 1 });
courseSchema.index({ ageGroup: 1 });

module.exports = mongoose.model('Course', courseSchema);
