const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const adminController = require('./admin.controller');

// Bütün admin route-ları: authenticated + yalnız admin rolu.
// Read-only MVP — yazma/silmə/rol dəyişikliyi route-u YOXDUR.
router.use(authenticate, roleCheck(['admin']));

router.get('/overview', adminController.getOverview);

module.exports = router;
