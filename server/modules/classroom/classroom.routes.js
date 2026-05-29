const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const controller = require('./classroom.controller');

// VACİB: ümumi /mine və /scan route-ları /:id-dən ƏVVƏL
router.get('/mine',           authenticate, controller.listMine);
router.post('/scan',          authenticate, roleCheck(['student']), controller.scanQR);

router.post('/',              authenticate, roleCheck(['teacher']), controller.create);
router.get('/:id',            authenticate, controller.getById);
router.get('/:id/attendance', authenticate, controller.getAttendance);

router.post('/:id/start',     authenticate, roleCheck(['teacher']), controller.start);
router.post('/:id/join',      authenticate, roleCheck(['student']), controller.join);
router.post('/:id/heartbeat', authenticate, roleCheck(['student']), controller.heartbeat);
router.post('/:id/end',       authenticate, roleCheck(['teacher']), controller.end);

module.exports = router;
