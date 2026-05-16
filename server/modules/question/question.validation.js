const Joi = require('joi');

const createQuestionValidation = Joi.object({
  text: Joi.string().required(),
  type: Joi.string().valid('multiple_choice', 'true_false', 'fill_in_blank').required(),
  options: Joi.array().items(
    Joi.object({
      label: Joi.string().required(),
      text: Joi.string().required(),
    })
  ).optional(),
  correctAnswer: Joi.string().required(),
  subject: Joi.string().required(),
  grade: Joi.number().integer().min(1).max(12).required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  points: Joi.number().integer().min(1).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

module.exports = { createQuestionValidation };
