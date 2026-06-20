const resultsService = require('./results.service');

// GET /api/results/me — tələbə öz nəticələri
const getMyResults = async (req, res, next) => {
  try {
    const data = await resultsService.getMyResults(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/results/teacher — müəllimin qruplarındakı tələbələr
const getTeacherResults = async (req, res, next) => {
  try {
    const data = await resultsService.getTeacherResults(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/results/student/:studentId — müəllim (yalnız öz qrupundakı tələbə)
const getStudentResults = async (req, res, next) => {
  try {
    const data = await resultsService.getStudentResultsForTeacher(req.user._id, req.params.studentId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/results/parent/child/:childId — valideyn (yalnız öz övladı)
const getChildResults = async (req, res, next) => {
  try {
    const data = await resultsService.getChildResultsForParent(req.user._id, req.params.childId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMyResults, getTeacherResults, getStudentResults, getChildResults };
