const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const controller = require('./results.controller');

// Bütün route-lar authenticated. Read-only — yazma endpoint-i YOXDUR.
router.use(authenticate);

// Tələbə yalnız öz nəticələri
router.get('/me', roleCheck(['student']), controller.getMyResults);

// Müəllim yalnız öz qruplarındakı tələbələr (əlaqə-scoped; service-də yoxlanır)
router.get('/teacher', roleCheck(['teacher']), controller.getTeacherResults);
router.get('/student/:studentId', roleCheck(['teacher']), controller.getStudentResults);

// Valideyn yalnız öz övladı (ownership service-də yoxlanır)
router.get('/parent/child/:childId', roleCheck(['parent']), controller.getChildResults);

module.exports = router;
