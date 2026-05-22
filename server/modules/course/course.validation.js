const Joi = require('joi');

const createCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().min(10).required(),
  category: Joi.string().trim().required(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  language: Joi.string().valid('az', 'ru', 'en').required(),
  price: Joi.number().min(0).default(0),
  discountPrice: Joi.number().min(0).allow(null).default(null),
  thumbnail: Joi.string().uri().allow(null, '').default(null),
  previewVideo: Joi.string().uri().allow(null, '').default(null),
  ageGroup: Joi.array()
    .items(Joi.string().valid('3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+'))
    .min(1)
    .required(),
  tags: Joi.array().items(Joi.string()).default([]),
  whatYouLearn: Joi.array().items(Joi.string()).default([]),
  requirements: Joi.array().items(Joi.string()).default([]),
  targetAudience: Joi.string().allow('').default(''),
  certificate: Joi.boolean().default(false),
});

const updateCourseSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  description: Joi.string().min(10),
  category: Joi.string().trim(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  language: Joi.string().valid('az', 'ru', 'en'),
  price: Joi.number().min(0),
  discountPrice: Joi.number().min(0).allow(null),
  thumbnail: Joi.string().uri().allow(null, ''),
  previewVideo: Joi.string().uri().allow(null, ''),
  ageGroup: Joi.array()
    .items(Joi.string().valid('3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+')),
  tags: Joi.array().items(Joi.string()),
  whatYouLearn: Joi.array().items(Joi.string()),
  requirements: Joi.array().items(Joi.string()),
  targetAudience: Joi.string().allow(''),
  certificate: Joi.boolean(),
});

const addLessonSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().allow('').default(''),
  videoUrl: Joi.string().uri().allow(null, '').default(null),
  duration: Joi.number().min(0).default(0),
  isFree: Joi.boolean().default(false),
  resources: Joi.array().items(Joi.string().uri()).default([]),
  quiz: Joi.string().hex().length(24).allow(null).default(null),
});

const enrollSchema = Joi.object({
  courseId: Joi.string().hex().length(24).required(),
  paymentId: Joi.string().hex().length(24).allow(null).default(null),
});

const completeLessonSchema = Joi.object({
  lessonId: Joi.string().hex().length(24).required(),
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  addLessonSchema,
  enrollSchema,
  completeLessonSchema,
};
