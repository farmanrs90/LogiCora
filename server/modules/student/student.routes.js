const express = require('express');
const router = express.Router();

const studentController = require('./student.controller');
const { createStudentValidation, updateStudentValidation } = require('./student.validation');
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

router.post('/', auth, roleCheck(['student']), validate(createStudentValidation), studentController.createStudent);
router.get('/', auth, roleCheck(['student']), studentController.getStudent);
router.put('/', auth, roleCheck(['student']), validate(updateStudentValidation), studentController.updateStudent);
router.delete('/', auth, roleCheck(['student']), studentController.deleteStudent);

module.exports = router;
