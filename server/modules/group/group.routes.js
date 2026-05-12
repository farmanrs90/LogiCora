const express = require('express');
const router = express.Router();

const groupController = require('./group.controller');
const { createGroupValidation, updateGroupValidation } = require('./group.validation');
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

router.post('/', auth, roleCheck(['admin', 'manager']), validate(createGroupValidation), groupController.createGroup);
router.get('/', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.getAllGroups);
router.get('/:groupId', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.getGroupById);
router.put('/:groupId', auth, roleCheck(['admin', 'manager']), validate(updateGroupValidation), groupController.updateGroup);
router.delete('/:groupId', auth, roleCheck(['admin', 'manager']), groupController.deleteGroup);

router.post('/:groupId/student', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.addStudent);
router.delete('/:groupId/student/:studentId', auth, roleCheck(['admin', 'manager', 'teacher']), groupController.removeStudent);

module.exports = router;