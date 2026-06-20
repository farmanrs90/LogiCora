const Joi = require('joi');

const registerValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().allow('').optional(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().min(7).max(20).required(),
  role: Joi.string()
    .valid('student', 'parent', 'teacher')
    .default('student')
    .messages({
      'any.only': 'Public registration supports only student, teacher, or parent roles.',
    }),
  password: Joi.string().min(6).max(128).required(),
  ageGroup: Joi.string().valid('3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+').required(),
});
const completeOnboardingValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  ageGroup: Joi.string().valid('3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+').required(),
  characterType: Joi.string().valid('fast-thinker', 'deep-analyst', 'creative-explorer').required(),
  knowledgeLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
});


const loginValidation = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const refreshTokenValidation = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  completeOnboardingValidation,
};
