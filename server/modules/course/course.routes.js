const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { validate } = require('../../middleware/validation');
const courseController = require('./course.controller');
const Student = require('../student/student.model');
const {
  createCourseSchema,
  updateCourseSchema,
  addLessonSchema,
  enrollSchema,
  completeLessonSchema,
} = require('./course.validation');

// Student profilini req.student-ə yapışdıran middleware
const attachStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Tələbə profili tapılmadı.' });
    }
    req.student = student;
    next();
  } catch (err) {
    next(err);
  }
};

// Public routes
router.get('/', courseController.getCourses);
router.get('/:id', optionalAuth, courseController.getCourseById);

// Teacher routes
router.post(
  '/',
  authenticate,
  checkRole('teacher'),
  validate(createCourseSchema),
  courseController.createCourse
);

router.put(
  '/:id',
  authenticate,
  checkRole('teacher'),
  validate(updateCourseSchema),
  courseController.updateCourse
);

router.patch(
  '/:id/publish',
  authenticate,
  checkRole('teacher'),
  courseController.publishCourse
);

router.delete(
  '/:id',
  authenticate,
  checkRole('teacher'),
  courseController.deleteCourse
);

router.post(
  '/:id/lessons',
  authenticate,
  checkRole('teacher'),
  validate(addLessonSchema),
  courseController.addLesson
);

// Student routes
router.post(
  '/enroll',
  authenticate,
  checkRole('student'),
  attachStudent,
  validate(enrollSchema),
  courseController.enrollStudent
);

router.post(
  '/:id/complete-lesson',
  authenticate,
  checkRole('student'),
  attachStudent,
  validate(completeLessonSchema),
  courseController.completeLesson
);

router.get(
  '/my/enrollments',
  authenticate,
  checkRole('student'),
  attachStudent,
  courseController.getMyEnrollments
);

module.exports = router;
