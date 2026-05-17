const Joi = require('joi');

const createCompetitionSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  groupId: Joi.string().hex().length(24).optional(),
  questions: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().hex().length(24).required(),
        timeLimit: Joi.number().integer().min(10).max(120).default(30),
        points: Joi.number().integer().min(10).max(1000).default(100),
      })
    )
    .min(1)
    .required(),
});

const submitAnswerSchema = Joi.object({
  questionId: Joi.string().hex().length(24).required(),
  selectedAnswer: Joi.string().required(),
  responseTime: Joi.number().integer().min(0).required(),
});

module.exports = { createCompetitionSchema, submitAnswerSchema };
