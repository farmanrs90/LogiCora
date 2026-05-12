const Joi = require('joi');

const updateProfileValidation = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  surname: Joi.string().allow('').optional(),
  phone: Joi.string().min(7).max(20).optional(),
  school: Joi.string().optional(),
  parentName: Joi.string().optional(),
  parentContact: Joi.string().optional(),
  hobbies: Joi.array().items(Joi.string()).optional(),
  isSpecialNeeds: Joi.boolean().optional(),
  specialNeedsType: Joi.string().valid('physical', 'cognitive', 'emotional', 'sensory', 'autism', 'other', '').optional(),
});

const changePasswordValidation = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required(),
});

module.exports = {
  updateProfileValidation,
  changePasswordValidation,
};