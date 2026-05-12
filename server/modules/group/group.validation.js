const Joi = require('joi');

const createGroupValidation = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  teacherId: Joi.string().required(),
  studentIds: Joi.array().items(Joi.string()).optional(),
  schedule: Joi.object({
    day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
  }).optional(),
  status: Joi.string().valid('active', 'inactive', 'archived').optional(),
});

const updateGroupValidation = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  teacherId: Joi.string().optional(),
  studentIds: Joi.array().items(Joi.string()).optional(),
  schedule: Joi.object({
    day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
    startTime: Joi.string().required(),
    endTime: Joi.string().required(),
  }).optional(),
  status: Joi.string().valid('active', 'inactive', 'archived').optional(),
});

module.exports = {
  createGroupValidation,
  updateGroupValidation,
};