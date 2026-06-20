const express = require('express');
const router = express.Router();
const Joi = require('joi');

const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const Feedback = require('./feedback.model');
const controller = require('./feedback.controller');

// İstifadəçi yalnız məzmunu göndərir — role/status/adminNote SERVER tərəfdə təyin olunur.
const createSchema = Joi.object({
  category: Joi.string().valid(...Feedback.CATEGORIES).required(),
  type: Joi.string().valid(...Feedback.TYPES).required(),
  priority: Joi.string().valid(...Feedback.PRIORITIES).optional(),
  title: Joi.string().min(3).max(120).required().messages({
    'string.min': 'Başlıq ən azı 3 simvol olmalıdır.',
    'any.required': 'Başlıq tələb olunur.',
  }),
  message: Joi.string().min(5).max(2000).required().messages({
    'string.min': 'Mesaj ən azı 5 simvol olmalıdır.',
    'any.required': 'Mesaj tələb olunur.',
  }),
});

const statusSchema = Joi.object({
  status: Joi.string().valid(...Feedback.STATUSES).required(),
  adminNote: Joi.string().allow('').max(2000).optional(),
});

// Bütün route-lar authenticated olmalıdır.
router.use(authenticate);

// İstifadəçi (hər authenticated rol)
router.post('/', validate(createSchema), controller.createFeedback);
router.get('/my', controller.getMyFeedback);

// Admin — yalnız admin rolu (silmə route-u YOXDUR)
router.get('/admin', roleCheck(['admin']), controller.adminList);
router.patch('/admin/:id/status', roleCheck(['admin']), validate(statusSchema), controller.adminUpdateStatus);

module.exports = router;
