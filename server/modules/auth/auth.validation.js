const Joi = require('joi');

const registerValidation = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().allow('').optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(7).max(20).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('student', 'teacher', 'admin', 'parent', 'manager').optional(),
  ageGroup: Joi.string().valid('3-5', '6-8', '9-11', '12-14', '15-17').required(),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerValidation,
  loginValidation,
};