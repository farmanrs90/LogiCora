const Joi = require('joi');

const createPaymentSchema = Joi.object({
  studentId: Joi.string().hex().length(24).required(),
  groupId: Joi.string().hex().length(24).optional(),
  type: Joi.string().valid('group_fee', 'premium', 'course', 'platform_subscription').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'bank_transfer', 'online').default('cash'),
  totalAmount: Joi.number().positive().required(),
  dueDate: Joi.date().required(),
  installmentCount: Joi.number().integer().min(1).max(12).default(1),
  note: Joi.string().allow('').optional(),
});

module.exports = { createPaymentSchema };
