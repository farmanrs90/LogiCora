const questionService = require('./question.service');

const createQuestion = async (req, res, next) => {
  try {
    const data = await questionService.createQuestion(req.user.id, req.body);
    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

const getQuestion = async (req, res, next) => {
  try {
    const data = await questionService.getQuestion(req.params.questionId);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const getAllQuestions = async (req, res, next) => {
  try {
    const data = await questionService.getAllQuestions(req.query);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const data = await questionService.getSubjects();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const data = await questionService.updateQuestion(
      req.params.questionId,
      req.user.id,
      req.body
    );
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    await questionService.deleteQuestion(req.params.questionId, req.user.id);
    return res.status(200).json({ message: 'Question deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuestion,
  getQuestion,
  getAllQuestions,
  getSubjects,
  updateQuestion,
  deleteQuestion,
};
