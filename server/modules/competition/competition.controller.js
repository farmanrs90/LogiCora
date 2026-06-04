const competitionService = require('./competition.service');
const Competition = require('./competition.model');
const Student = require('../student/student.model');

const createCompetition = async (req, res, next) => {
  try {
    const competition = await competitionService.createCompetition(req.user.id, req.body);
    res.status(201).json({ success: true, data: competition });
  } catch (err) {
    next(err);
  }
};

const joinCompetition = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const competition = await competitionService.joinCompetition(req.params.pin, student._id);
    res.json({ success: true, data: competition });
  } catch (err) {
    next(err);
  }
};

const startCompetition = async (req, res, next) => {
  try {
    const competition = await competitionService.startCompetition(req.params.id, req.user.id);
    res.json({ success: true, data: competition });
  } catch (err) {
    next(err);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const result = await competitionService.submitAnswer(req.params.id, student._id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const finishCompetition = async (req, res, next) => {
  try {
    const competition = await competitionService.finishCompetition(req.params.id, req.user.id);
    res.json({ success: true, data: competition });
  } catch (err) {
    next(err);
  }
};

const getActive = async (req, res, next) => {
  try {
    const active = await Competition.find({
      status: { $in: ['waiting', 'active'] },
    }).populate('createdBy', 'name surname');
    res.json({ success: true, data: active });
  } catch (err) {
    next(err);
  }
};

const getCompetition = async (req, res, next) => {
  try {
    const competition = await competitionService.getCompetition(req.params.id);
    res.json({ success: true, data: competition });
  } catch (err) {
    next(err);
  }
};
const getResults = async (req, res, next) => {
  try {
    const results = await competitionService.getResults(req.params.id, req.user.id);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCompetition,
  joinCompetition,
  startCompetition,
  submitAnswer,
  finishCompetition,
  getActive,
  getCompetition,
  getResults,
};
