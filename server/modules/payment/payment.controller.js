const paymentService = require('./payment.service');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');

const createPayment = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 404;
      throw error;
    }

    const payment = await paymentService.createPayment(req.user.id, req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

const payInstallment = async (req, res, next) => {
  try {
    const { paymentId, installmentId } = req.params;
    const payment = await paymentService.payInstallment(paymentId, installmentId);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const payments = await paymentService.getStudentPayments(student._id);
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

const getGroupPayments = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 404;
      throw error;
    }

    const payments = await paymentService.getGroupPayments(req.params.groupId);
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

const checkPremium = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      const error = new Error('Student profile not found');
      error.statusCode = 404;
      throw error;
    }

    const hasPremium = await paymentService.checkPremiumAccess(student._id);
    res.json({ success: true, data: { hasPremium } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPayment,
  payInstallment,
  getMyPayments,
  getGroupPayments,
  checkPremium,
};
