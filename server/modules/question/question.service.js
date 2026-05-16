const Question = require('./question.model');

const createQuestion = async (userId, payload) => {
  const question = await Question.create({ ...payload, createdBy: userId });
  return question;
};

const getQuestion = async (questionId) => {
  const question = await Question.findById(questionId).populate('createdBy', 'name surname');
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }
  return question;
};

const getAllQuestions = async (filters) => {
  const query = {};
  if (filters.subject) query.subject = filters.subject;
  if (filters.grade) query.grade = Number(filters.grade);
  if (filters.difficulty) query.difficulty = filters.difficulty;

  const questions = await Question.find(query)
    .populate('createdBy', 'name surname')
    .sort({ createdAt: -1 });

  return questions;
};

const updateQuestion = async (questionId, userId, payload) => {
  const question = await Question.findById(questionId);
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  if (question.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  const updated = await Question.findByIdAndUpdate(
    questionId,
    { $set: payload },
    { new: true, runValidators: true }
  );
  return updated;
};

const deleteQuestion = async (questionId, userId) => {
  const question = await Question.findById(questionId);
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  if (question.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  await Question.findByIdAndDelete(questionId);
  return { message: 'Question deleted successfully' };
};

module.exports = {
  createQuestion,
  getQuestion,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
};
