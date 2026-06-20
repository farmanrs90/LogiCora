const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const controller = require('./question.controller');
const { createQuestionValidation } = require('./question.validation');

router.post(
  '/',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  validate(createQuestionValidation),
  controller.createQuestion
);

router.get('/', auth, controller.getAllQuestions);

router.get('/subjects', auth, controller.getSubjects);

router.get('/:questionId', auth, controller.getQuestion);

router.put(
  '/:questionId',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  controller.updateQuestion
);

router.delete(
  '/:questionId',
  auth,
  roleCheck(['teacher', 'admin', 'manager']),
  controller.deleteQuestion
);

module.exports = router;
