const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const roleCheck = require('../../middleware/roleCheck');
const {
  getMyConfig,
  updateMyConfig,
  getChildConfig,
  updateChildSpecialNeeds,
} = require('./accessibility.service');
const Joi = require('joi');

const updateConfigSchema = Joi.object({
  fontSize: Joi.string().valid('sm', 'md', 'lg', 'xl'),
  highContrast: Joi.boolean(),
  audioQuestions: Joi.boolean(),
  simplifiedUI: Joi.boolean(),
  noAnimations: Joi.boolean(),
  largeClickTargets: Joi.boolean(),
  keyboardOnly: Joi.boolean(),
}).min(1);

// Parent → child special needs (frontend hasSpecialNeeds + types[] göndərir)
const updateChildSpecialNeedsSchema = Joi.object({
  hasSpecialNeeds: Joi.boolean().required(),
  types: Joi.array().items(Joi.string()).default([]),
});

router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const config = await getMyConfig(req.user._id);
    res.status(200).json({ success: true, data: config, message: 'Konfiqurasiya alındı.' });
  } catch (err) {
    next(err);
  }
});

router.put('/me', validate(updateConfigSchema), async (req, res, next) => {
  try {
    const config = await updateMyConfig(req.user._id, req.body);
    res.status(200).json({ success: true, data: config, message: 'Konfiqurasiya yeniləndi.' });
  } catch (err) {
    next(err);
  }
});

// ── Parent → child accessibility (parent ownership service-də yoxlanır) ──
router.get('/child/:childId', roleCheck(['parent']), async (req, res, next) => {
  try {
    const config = await getChildConfig(req.user._id, req.params.childId);
    res.status(200).json({ success: true, data: config, message: 'Konfiqurasiya alındı.' });
  } catch (err) {
    next(err);
  }
});

router.put('/child/:childId', roleCheck(['parent']), validate(updateChildSpecialNeedsSchema), async (req, res, next) => {
  try {
    const config = await updateChildSpecialNeeds(req.user._id, req.params.childId, req.body);
    res.status(200).json({ success: true, data: config, message: 'Konfiqurasiya yeniləndi.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
