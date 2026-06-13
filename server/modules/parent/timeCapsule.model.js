const mongoose = require('mongoose');

// Parent → uşaq üçün "zaman kapsulu" mesajı. Real DB-də saxlanılır.
// openAt tarixində açıq sayılır; böyük açılma/notification mexanizmi qəsdən yazılmır.
const timeCapsuleSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parent',
      required: true,
      index: true,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    openAt: {
      type: Date,
      required: true,
    },
    isOpened: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('TimeCapsule', timeCapsuleSchema);
