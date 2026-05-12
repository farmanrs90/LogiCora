const Joi = require('joi');

const createStudentValidation = Joi.object({
  grade: Joi.number().integer().min(1).max(12).required(),
  school: Joi.string().required(),
  parentId: Joi.string().optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  learningStyle: Joi.string().valid('visual', 'auditory', 'kinesthetic', 'reading_writing').optional(),
});

const updateStudentValidation = Joi.object({
  grade: Joi.number().integer().min(1).max(12).optional(),
  school: Joi.string().optional(),
  parentId: Joi.string().optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  learningStyle: Joi.string().valid('visual', 'auditory', 'kinesthetic', 'reading_writing').optional(),
});

module.exports = {
  createStudentValidation,
  updateStudentValidation,
};