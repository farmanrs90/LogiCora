const express = require('express');
const router = express.Router();


const authController = require('./auth.controller');
const validate = require('../../middleware/validation');
const { authenticate: auth } = require('../../middleware/auth');
const { authLimiter, strictLimiter } = require('../../middleware/rateLimiter');
const { registerValidation, loginValidation, refreshTokenValidation, completeOnboardingValidation } = require('./auth.validation');

router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.post('/refresh', strictLimiter, validate(refreshTokenValidation), authController.refresh);
router.post('/logout', auth, authController.logout);
router.post('/complete-onboarding', auth, validate(completeOnboardingValidation), authController.completeOnboarding);

module.exports = router;