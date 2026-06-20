const express = require('express');
const router = express.Router();
const Joi = require('joi');

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const controller = require('./center.controller');

const applySchema = Joi.object({
  centerName: Joi.string().trim().min(2).max(120).required().messages({
    'string.min': 'Mərkəz adı ən azı 2 simvol olmalıdır.',
    'any.required': 'Mərkəz adı tələb olunur.',
  }),
  centerType: Joi.string().valid('individual_teacher', 'course_center', 'school_or_org').optional(),
  // VÖEN/sənəd opsionaldır (fərdi müəllim/kiçik qrup boş saxlaya bilər).
  taxIdOrVoen: Joi.string().trim().max(40).allow('').optional(),
  documentUrl: Joi.string().trim().uri().max(500).allow('').optional(),
  contactName: Joi.string().trim().max(120).allow('').optional(),
  phone: Joi.string().trim().min(7).max(20).required().messages({
    'any.required': 'Telefon tələb olunur.',
    'string.min': 'Telefon nömrəsi düzgün deyil.',
  }),
  address: Joi.string().trim().min(3).max(300).required().messages({
    'any.required': 'Ünvan tələb olunur.',
  }),
  city: Joi.string().trim().max(60).allow('').optional(),
  description: Joi.string().trim().max(1000).allow('').optional(),
});

const reviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  adminNote: Joi.string().trim().max(1000).allow('').optional(),
  // verified yalnız VÖEN/sənəd olduqda tətbiq olunur (service-də yoxlanır).
  verificationLevel: Joi.string().valid('basic', 'verified').optional(),
});

// ── İctimai / müəllim (mövcud) ───────────────────────────────────────────────
router.get('/public', controller.getPublicCenters);
router.get('/me', authenticate, roleCheck(['teacher']), controller.getMyCenter);

// ── Müraciət (hər authenticated istifadəçi) ──────────────────────────────────
router.post('/apply', authenticate, validate(applySchema), controller.applyForCenter);
router.get('/my-application', authenticate, controller.getMyApplication);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin', authenticate, roleCheck(['admin']), controller.getAdminCenters);
router.get('/applications', authenticate, roleCheck(['admin']), controller.listApplications);
router.patch('/applications/:id/review', authenticate, roleCheck(['admin']), validate(reviewSchema), controller.reviewApplication);

module.exports = router;
