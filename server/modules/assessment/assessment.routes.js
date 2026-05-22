const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const controller = require('./assessment.controller');
const {
  createAssessmentValidation,
  addQuestionValidation,
  submitAssessmentValidation,
} = require('./assessment.validation');

router.post(
  '/',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  validate(createAssessmentValidation),
  controller.createAssessment
);

router.post(
  '/:assessmentId/questions',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  validate(addQuestionValidation),
  controller.addQuestion
);

router.patch(
  '/:assessmentId/publish',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  controller.publishAssessment
);

router.get(
  '/:assessmentId',
  auth,
  controller.getAssessment
);

router.post(
  '/:assessmentId/submit',
  auth,
  roleCheck(['student']),
  validate(submitAssessmentValidation),
  controller.submitAssessment
);

router.get(
  '/:assessmentId/my-submission',
  auth,
  roleCheck(['student']),
  controller.getMySubmission
);

router.get(
  '/:assessmentId/results',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  controller.getAssessmentResults
);

module.exports = router;
