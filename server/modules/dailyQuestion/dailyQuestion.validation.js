const Joi = require('joi');

const submitAnswerSchema = Joi.object({
  questionId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Sual ID formatı yanlışdır.',
    'any.required': 'questionId tələb olunur.',
  }),
  answer: Joi.string().trim().min(1).max(500).required().messages({
    'any.required': 'Cavab tələb olunur.',
    'string.empty': 'Cavab boş ola bilməz.',
  }),
});

module.exports = { submitAnswerSchema };
