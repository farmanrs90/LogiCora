const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
  },
  { _id: true }
);

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    type: {
      type: String,
      enum: ['group_fee', 'premium', 'course', 'platform_subscription'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'online'],
      default: 'cash',
    },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending',
    },
    dueDate: { type: Date, required: true },
    installments: [installmentSchema],
    note: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false }
);

paymentSchema.index({ studentId: 1, status: 1 });
paymentSchema.index({ groupId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
