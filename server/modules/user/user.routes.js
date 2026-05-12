const express = require('express');
const router = express.Router();

const userController = require('./user.controller');
const { updateProfileValidation, changePasswordValidation } = require('./user.validation');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validation');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, validate(updateProfileValidation), userController.updateProfile);
router.post('/change-password', auth, validate(changePasswordValidation), userController.changePassword);
router.post('/verify-phone', auth, userController.verifyPhone);
router.post('/complete-profile', auth, userController.completeProfile);

module.exports = router;