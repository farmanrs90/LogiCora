const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const validate = require('../../middleware/validation');
const { createPaymentSchema } = require('./payment.validation');
const controller = require('./payment.controller');

router.post(
  '/',
  authenticate,
  roleCheck('teacher'),
  validate(createPaymentSchema),
  controller.createPayment
);

router.patch(
  '/:paymentId/installments/:installmentId',
  authenticate,
  controller.payInstallment
);

router.get(
  '/me',
  authenticate,
  roleCheck('student'),
  controller.getMyPayments
);

router.get(
  '/groups/:groupId',
  authenticate,
  roleCheck('teacher'),
  controller.getGroupPayments
);

router.get(
  '/premium/check',
  authenticate,
  controller.checkPremium
);

module.exports = router;
