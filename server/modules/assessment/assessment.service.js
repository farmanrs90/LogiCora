const Assessment = require('./assessment.model');
const Question = require('../question/question.model');
const Submission = require('./submission.model');
const Student = require('../student/student.model');

const createAssessment = async (userId, payload) => {
  const assessment = await Assessment.create({
    ...payload,
    createdBy: userId,
    totalPoints: 0,
  });
  return assessment;
};

const addQuestion = async (assessmentId, userId, questionId, points) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assessment.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  const question = await Question.findById(questionId);
  if (!question) {
    const error = new Error('Question not found');
    error.statusCode = 404;
    throw error;
  }

  const alreadyAdded = assessment.questions.some(
    (q) => q.questionId.toString() === questionId
  );
  if (alreadyAdded) {
    const error = new Error('Question already in assessment');
    error.statusCode = 409;
    throw error;
  }

  assessment.questions.push({ questionId, points });
  assessment.totalPoints += points;
  await assessment.save();

  return assessment;
};

const publishAssessment = async (assessmentId, userId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assessment.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  if (assessment.questions.length === 0) {
    const error = new Error('Cannot publish assessment with no questions');
    error.statusCode = 400;
    throw error;
  }

  assessment.status = 'published';
  await assessment.save();

  return assessment;
};

const getAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate('createdBy', 'name surname')
    .populate('questions.questionId');

  if (!assessment) {
    const error = new Error('Assessment not found');
    error.statusCode = 404;
    throw error;
  }

  return assessment;
};

const submitAssessment = async (assessmentId, userId, answers, timeSpent) => {
  const assessment = await Assessment.findById(assessmentId).populate(
    'questions.questionId'
  );
  if (!assessment) {
    const error = new Error('Assessment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assessment.status !== 'published') {
    const error = new Error('Assessment is not available');
    error.statusCode = 400;
    throw error;
  }

  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  const alreadySubmitted = await Submission.findOne({
    assessmentId,
    studentId: student._id,
  });
  if (alreadySubmitted) {
    const error = new Error('Already submitted');
    error.statusCode = 409;
    throw error;
  }

  let score = 0;
  const gradedAnswers = assessment.questions.map((q) => {
    const studentAnswer = answers.find(
      (a) => a.questionId === q.questionId._id.toString()
    );
    const selectedAnswer = studentAnswer ? studentAnswer.selectedAnswer : '';
    const isCorrect = selectedAnswer === q.questionId.correctAnswer;
    const pointsEarned = isCorrect ? q.points : 0;
    score += pointsEarned;

    return {
      questionId: q.questionId._id,
      selectedAnswer,
      isCorrect,
      pointsEarned,
    };
  });

  const percentage = Math.round((score / assessment.totalPoints) * 100);
  const passed = percentage >= assessment.passingScore;

  const submission = await Submission.create({
    assessmentId,
    studentId: student._id,
    answers: gradedAnswers,
    score,
    totalPoints: assessment.totalPoints,
    percentage,
    passed,
    timeSpent,
  });

  await Student.findByIdAndUpdate(student._id, {
    $inc: { points: score },
  });

  return submission;
};

const getMySubmission = async (assessmentId, userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Student profile not found');
    error.statusCode = 404;
    throw error;
  }

  const submission = await Submission.findOne({
    assessmentId,
    studentId: student._id,
  }).populate('answers.questionId', 'text correctAnswer');

  if (!submission) {
    const error = new Error('Submission not found');
    error.statusCode = 404;
    throw error;
  }

  return submission;
};

const getAssessmentResults = async (assessmentId, userId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found');
    error.statusCode = 404;
    throw error;
  }

  if (assessment.createdBy.toString() !== userId) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  const results = await Submission.find({ assessmentId })
    .populate('studentId', 'userId grade')
    .populate('studentId.userId', 'name surname');

  return results;
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
