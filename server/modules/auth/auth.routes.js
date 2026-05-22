const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { registerValidation, loginValidation, refreshTokenValidation } = require('./auth.validation');
const validate = require('../../middleware/validation');
const { authenticate: auth } = require('../../middleware/auth');
const { authLimiter, strictLimiter } = require('../../middleware/rateLimiter');

router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.post('/refresh', strictLimiter, validate(refreshTokenValidation), authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router;
