const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const showcaseController = require('./showcase.controller');

// Public routes
router.get('/featured', showcaseController.getFeaturedTeachers);
router.get('/:slug', showcaseController.getTeacherBySlug);
router.get('/:slug/courses', showcaseController.getTeacherCourses);
router.get('/:slug/competitions', showcaseController.getTeacherCompetitions);

// Teacher route — öz storefrontunu yeniləyir
router.put(
  '/me/showcase',
  authenticate,
  checkRole('teacher'),
  showcaseController.updateShowcase
);

// Admin route — müəllimi featured edir
router.post(
  '/:id/feature',
  authenticate,
  checkRole('admin'),
  showcaseController.featureTeacher
);

module.exports = router;
