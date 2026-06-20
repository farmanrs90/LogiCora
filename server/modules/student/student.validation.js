const Joi = require('joi');

const boundedTextArray = (maxItems) =>
  Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(maxItems)
    .optional();

const learningStyleValidation = Joi.string()
  .valid('visual', 'auditory', 'kinesthetic', 'reading_writing')
  .optional();

const knowledgeLevelValidation = Joi.string()
  .valid('beginner', 'intermediate', 'advanced')
  .optional();

const createStudentValidation = Joi.object({
  grade: Joi.number().integer().min(1).max(12).required(),
  school: Joi.string().required(),
  subjects: boundedTextArray(12),
  interests: boundedTextArray(20),
  learningStyle: learningStyleValidation,
  knowledgeLevel: knowledgeLevelValidation,
});

const updateStudentValidation = Joi.object({
  grade: Joi.number().integer().min(1).max(12).optional(),
  school: Joi.string().optional(),
  subjects: boundedTextArray(12),
  interests: boundedTextArray(20),
  learningStyle: learningStyleValidation,
  knowledgeLevel: knowledgeLevelValidation,
});

module.exports = {
  createStudentValidation,
  updateStudentValidation,
};
