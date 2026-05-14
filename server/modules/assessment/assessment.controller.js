const assessmentService = require('./assessment.service');

const createAssessment = async (req, res, next) => {
  try {
    const data = await assessmentService.createAssessment(req.user.id, req.body);
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const { questionId, points } = req.body;
    const data = await assessmentService.addQuestion(
      assessmentId,
      req.user.id,
      questionId,
      points
    );
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const publishAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const data = await assessmentService.publishAssessment(assessmentId, req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const data = await assessmentService.getAssessment(assessmentId);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const submitAssessment = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const { answers, timeSpent } = req.body;
    const data = await assessmentService.submitAssessment(
      assessmentId,
      req.user.id,
      answers,
      timeSpent
    );
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};

const getMySubmission = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const data = await assessmentService.getMySubmission(assessmentId, req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getAssessmentResults = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const data = await assessmentService.getAssessmentResults(assessmentId, req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAssessment,
  addQuestion,
  publishAssessment,
  getAssessment,
  submitAssessment,
  getMySubmission,
  getAssessmentResults,
};
