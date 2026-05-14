const Joi = require('joi');

const createAssessmentValidation = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  subject: Joi.string().required(),
  grade: Joi.number().integer().min(1).max(12).required(),
  passingScore: Joi.number().min(0).max(100).optional(),
  timeLimit: Joi.number().min(1).optional().allow(null),
  assignedTo: Joi.string().valid('public', 'group', 'students').optional(),
  groupId: Joi.string().optional().allow(null),
  studentIds: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
});

const addQuestionValidation = Joi.object({
  questionId: Joi.string().required(),
  points: Joi.number().integer().min(1).required(),
});

const submitAssessmentValidation = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        selectedAnswer: Joi.string().required().allow(''),
      })
    )
    .required(),
  timeSpent: Joi.number().min(0).required(),
});

module.exports = {
  createAssessmentValidation,
  addQuestionValidation,
  submitAssessmentValidation,
};
