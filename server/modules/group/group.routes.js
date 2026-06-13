const express = require('express');
const router = express.Router();

const groupController = require('./group.controller');
const { createGroupValidation, updateGroupValidation } = require('./group.validation');
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

// Create — teacher də öz qrupunu yarada bilər; teacherId controller-də user-dən götürülür,
// frontend body (subject/days/time) service-də map olunur → strict createGroupValidation tətbiq edilmir.
router.post('/', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.createGroup);
router.get('/', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.getAllGroups);
router.get('/:groupId', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.getGroupById);
router.put('/:groupId', auth, roleCheck(['admin', 'manager']), validate(updateGroupValidation), groupController.updateGroup);
router.delete('/:groupId', auth, roleCheck(['admin', 'manager']), groupController.deleteGroup);

router.post('/:groupId/student', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.addStudent);
router.delete('/:groupId/student/:studentId', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.removeStudent);
// Email ilə dəvət + davamiyyət (frontend contract-ı ilə uyğun, ownership service-də)
router.post('/:groupId/invite', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.inviteStudent);
router.post('/:groupId/attendance', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.saveAttendance);

module.exports = router;