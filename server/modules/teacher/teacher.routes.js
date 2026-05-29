const express = require('express');
const router = express.Router();

const teacherController = require('./teacher.controller');
const { createTeacherValidation, updateTeacherValidation } = require('./teacher.validation');
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

// ── Dashboard (me) route-ları — /:id tipli route-lardan ƏVVƏL ──
router.get('/me/stats', auth, roleCheck(['teacher']), teacherController.getMyStats);
router.get('/me/schedule/today', auth, roleCheck(['teacher']), teacherController.getTodaySchedule);
router.get('/me/students', auth, roleCheck(['teacher']), teacherController.getMyStudents);
router.get('/me/courses/performance', auth, roleCheck(['teacher']), teacherController.getMyCoursesPerformance);

// Protected routes (require authentication)
router.post('/', auth, roleCheck(['teacher']), validate(createTeacherValidation), teacherController.createTeacher);
router.get('/', auth, roleCheck(['teacher']), teacherController.getTeacher);
router.put('/', auth, roleCheck(['teacher']), validate(updateTeacherValidation), teacherController.updateTeacher);
router.delete('/', auth, roleCheck(['teacher']), teacherController.deleteTeacher);

// Add/remove group from teacher
router.post('/group', auth, roleCheck(['teacher']), teacherController.addGroup);
router.delete('/group/:groupId', auth, roleCheck(['teacher']), teacherController.removeGroup);

// Public route (get all teachers)
router.get('/all', teacherController.getAllTeachers);

module.exports = router;