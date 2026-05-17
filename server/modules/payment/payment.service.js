const Payment = require('./payment.model');
const { sendToStudent } = require('../notification/notification.service');

const createPayment = async (userId, { studentId, groupId, type, paymentMethod, totalAmount, dueDate, installmentCount = 1, note }) => {
  const installments = [];
  const amountPerInstallment = Math.round(totalAmount / installmentCount);
  const due = new Date(dueDate);

  for (let i = 0; i < installmentCount; i++) {
    const installmentDue = new Date(due);
    installmentDue.setMonth(installmentDue.getMonth() + i);
    installments.push({
      amount: amountPerInstallment,
      dueDate: installmentDue,
      status: 'pending',
    });
  }

  const payment = await Payment.create({
    studentId,
    paidBy: userId,
    groupId: groupId || null,
    type,
    paymentMethod: paymentMethod || 'cash',
    totalAmount,
    paidAmount: 0,
    status: 'pending',
    dueDate: new Date(dueDate),
    installments,
    note: note || '',
  });

  return payment;
};

const payInstallment = async (paymentId, installmentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const error = new Error('Payment not found');
    error.statusCode = 404;
    throw error;
  }
  

  const installment = payment.installments.id(installmentId);
  if (!installment) {
    const error = new Error('Installment not found');
    error.statusCode = 404;
    throw error;
  }

  if (installment.status === 'paid') {
    const error = new Error('Already paid');
    error.statusCode = 409;
    throw error;
  }

  installment.status = 'paid';
  installment.paidAt = new Date();
  payment.paidAmount += installment.amount;

  const allPaid = payment.installments.every((i) => i.status === 'paid');
  payment.status = allPaid ? 'paid' : 'partial';

  await payment.save();
  await sendToStudent(payment.studentId, {
  type: 'payment_received',
  title: 'Ödəniş qəbul edildi',
  message: `${installment.amount} AZN ödəniş uğurla qeydə alındı`,
  meta: { paymentId: payment._id, amount: installment.amount },
});
  return payment;
};

const markOverdue = async () => {
  const now = new Date();

  await Payment.updateMany(
    { status: { $in: ['pending', 'partial'] }, dueDate: { $lt: now } },
    { $set: { status: 'overdue' } }
  );

  await Payment.updateMany(
    { 'installments.status': 'pending', 'installments.dueDate': { $lt: now } },
    { $set: { 'installments.$[elem].status': 'overdue' } },
    { arrayFilters: [{ 'elem.status': 'pending', 'elem.dueDate': { $lt: now } }] }
  );
};

const getStudentPayments = async (studentId) => {
  return Payment.find({ studentId })
    .sort({ createdAt: -1 })
    .populate('groupId', 'name');
};

const getGroupPayments = async (groupId) => {
  return Payment.find({ groupId })
    .sort({ createdAt: -1 })
    .populate('studentId', 'userId')
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name surname' } });
};

const checkPremiumAccess = async (studentId) => {
  const payment = await Payment.findOne({
    studentId,
    type: 'premium',
    status: 'paid',
  }).sort({ createdAt: -1 });

  return !!payment;
};

module.exports = {
  createPayment,
  payInstallment,
  markOverdue,
  getStudentPayments,
  getGroupPayments,
  checkPremiumAccess,
};
