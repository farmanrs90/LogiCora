const Joi = require('joi');

const createParentValidation = Joi.object({
  occupation: Joi.string().optional(),
  children: Joi.array().items(Joi.string()).optional(),
  notificationPreferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
  }).optional(),
});

const updateParentValidation = Joi.object({
  occupation: Joi.string().optional(),
  children: Joi.array().items(Joi.string()).optional(),
  notificationPreferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
  }).optional(),
});

module.exports = {
  createParentValidation,
  updateParentValidation,
};