const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const adminController = require('./admin.controller');

// Bütün admin route-ları: authenticated + yalnız admin rolu.
// Read-only MVP — yazma/silmə/rol dəyişikliyi route-u YOXDUR.
router.use(authenticate, roleCheck(['admin']));

router.get('/overview', adminController.getOverview);
router.get('/users', adminController.getUsers);
router.get('/courses', adminController.getCourses);
router.get('/groups', adminController.getGroups);

module.exports = router;
