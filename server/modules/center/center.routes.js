const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const controller = require('./center.controller');

// Read-only MVP — mərkəz yaratma/dəyişmə endpoint-i YOXDUR.
// İctimai aktiv mərkəzlər (display üçün; joinCode açılmır)
router.get('/public', controller.getPublicCenters);

// Müəllimin öz mərkəzi / independent vəziyyəti
router.get('/me', authenticate, roleCheck(['teacher']), controller.getMyCenter);

// Admin read-only siyahı
router.get('/admin', authenticate, roleCheck(['admin']), controller.getAdminCenters);

module.exports = router;
