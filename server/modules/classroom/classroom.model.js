const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  joinedAt:      { type: Date, default: Date.now },
  leftAt:        { type: Date, default: null },
  isPresent:     { type: Boolean, default: true },
  lastHeartbeat: { type: Date, default: Date.now },
}, { _id: false });

const classroomSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  groupId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  scheduledAt:  { type: Date,    default: Date.now },
  duration:     { type: Number,  default: 60 },          // dəqiqə
  qrToken:      { type: String,  default: null, select: false },
  qrExpiresAt:  { type: Date,    default: null },
  status:       { type: String,  enum: ['scheduled','live','ended'], default: 'scheduled' },
  participants: [participantSchema],
  startedAt:    { type: Date,    default: null },
  endedAt:      { type: Date,    default: null },
  recordingUrl: { type: String,  default: null },
}, { timestamps: true, versionKey: false });

classroomSchema.index({ teacherId: 1, status: 1 });
classroomSchema.index({ qrToken: 1 });

module.exports = mongoose.model('Classroom', classroomSchema);
