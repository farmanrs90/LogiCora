const express = require('express');
const router = express.Router();

const parentController = require('./parent.controller');
const { createParentValidation, updateParentValidation } = require('./parent.validation');
const { authenticate: auth } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');

router.post('/', auth, roleCheck(['parent']), validate(createParentValidation), parentController.createParent);
router.get('/', auth, roleCheck(['parent']), parentController.getParent);
router.put('/', auth, roleCheck(['parent']), validate(updateParentValidation), parentController.updateParent);
router.delete('/', auth, roleCheck(['parent']), parentController.deleteParent);

router.post('/child', auth, roleCheck(['parent']), parentController.addChild);
router.delete('/child/:childId', auth, roleCheck(['parent']), parentController.removeChild);
// ── Dashboard (read-only) endpointləri — hamısı parent rolu ilə qorunur ──
router.get('/children', auth, roleCheck(['parent']), parentController.getChildrenList);
router.get('/weekly-report', auth, roleCheck(['parent']), parentController.getWeeklyReport);
router.get('/payments', auth, roleCheck(['parent']), parentController.getPayments);
router.get('/time-capsules', auth, roleCheck(['parent']), parentController.getTimeCapsules);
router.post('/time-capsule', auth, roleCheck(['parent']), parentController.createTimeCapsule);

router.get('/child/:id/stats', auth, roleCheck(['parent']), parentController.getChildStats);
router.get('/child/:id/attendance', auth, roleCheck(['parent']), parentController.getChildAttendance);
router.get('/child/:id/teachers', auth, roleCheck(['parent']), parentController.getChildTeachers);
router.get('/child/:id/activity', auth, roleCheck(['parent']), parentController.getChildActivity);


module.exports = router;