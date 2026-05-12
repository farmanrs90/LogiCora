const Joi = require('joi');

const createTeacherValidation = Joi.object({
  specialization: Joi.string()
    .valid('mathematics', 'language', 'science', 'history', 'physical_education', 'art', 'music', 'other')
    .required(),
  qualifications: Joi.array()
    .items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
      })
    )
    .optional(),
  experience: Joi.number().integer().min(0).optional(),
  bio: Joi.string().max(500).optional(),
});

const updateTeacherValidation = Joi.object({
  specialization: Joi.string()
    .valid('mathematics', 'language', 'science', 'history', 'physical_education', 'art', 'music', 'other')
    .optional(),
  qualifications: Joi.array()
    .items(
      Joi.object({
        degree: Joi.string().required(),
        institution: Joi.string().required(),
        year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
      })
    )
    .optional(),
  experience: Joi.number().integer().min(0).optional(),
  bio: Joi.string().max(500).optional(),
});

module.exports = {
  createTeacherValidation,
  updateTeacherValidation,
};