const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { validate } = require('../../middleware/validation');
const portfolioController = require('./portfolio.controller');
const Joi = require('joi');

const visibilitySchema = Joi.object({
  isPublic: Joi.boolean().required(),
});

// Public route — token opsional
router.get('/view/:link', optionalAuth, portfolioController.getPortfolioByLink);

// Student routes
router.get(
  '/me',
  authenticate,
  checkRole('student'),
  portfolioController.getMyPortfolio
);

router.patch(
  '/me/visibility',
  authenticate,
  checkRole('student'),
  validate(visibilitySchema),
  portfolioController.updateVisibility
);

router.patch(
  '/me/regenerate-link',
  authenticate,
  checkRole('student'),
  portfolioController.regenerateLink
);

module.exports = router;
