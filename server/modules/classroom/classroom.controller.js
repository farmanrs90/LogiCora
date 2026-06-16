const crypto = require('crypto');
const Classroom = require('./classroom.model');
const Student = require('../student/student.model');
const Group = require('../group/group.model');

const QR_LIFETIME_MS = 30 * 60 * 1000; // 30 dəqiqə
const generateQR = () => crypto.randomBytes(16).toString('hex');

const create = async (req, res, next) => {
  try {
    const { title, groupId, scheduledAt, duration } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Başlıq tələb olunur.' });
    }
    const classroom = await Classroom.create({
      title:       title.trim(),
      teacherId:   req.user._id,
      groupId:     groupId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      duration:    duration || 60,
    });
    res.status(201).json({ success: true, data: classroom });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id)
      .populate('teacherId', 'name surname')
      .populate('groupId', 'name');
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
};

const start = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });
    if (String(c.teacherId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Yalnız müəllim dərsi başlada bilər.' });
    }
    c.status      = 'live';
    c.startedAt   = new Date();
    c.qrToken     = generateQR();
    c.qrExpiresAt = new Date(Date.now() + QR_LIFETIME_MS);
    await c.save();
    res.json({ success: true, data: {
      _id: c._id, status: c.status, qrToken: c.qrToken, qrExpiresAt: c.qrExpiresAt,
    }});
  } catch (err) { next(err); }
};

const join = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });
    if (c.status !== 'live') return res.status(400).json({ success: false, message: 'Dərs aktiv deyil.' });

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Tələbə profili tapılmadı.' });

    const existing = c.participants.find(p => String(p.studentId) === String(student._id));
    if (existing) {
      existing.isPresent     = true;
      existing.leftAt        = null;
      existing.lastHeartbeat = new Date();
    } else {
      c.participants.push({
        studentId: student._id,
        joinedAt:  new Date(),
        isPresent: true,
        lastHeartbeat: new Date(),
      });
    }
    await c.save();
    res.json({ success: true, data: { joined: true, classroomId: c._id } });
  } catch (err) { next(err); }
};

const scanQR = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ success: false, message: 'QR token tələb olunur.' });

    const c = await Classroom.findOne({ qrToken }).select('+qrToken');
    if (!c) return res.status(404).json({ success: false, message: 'QR etibarsızdır.' });
    if (c.qrExpiresAt && c.qrExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'QR-in vaxtı bitib.' });
    }
    if (c.status !== 'live') return res.status(400).json({ success: false, message: 'Dərs aktiv deyil.' });

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Tələbə profili tapılmadı.' });

    const existing = c.participants.find(p => String(p.studentId) === String(student._id));
    if (!existing) {
      c.participants.push({
        studentId: student._id, joinedAt: new Date(),
        isPresent: true, lastHeartbeat: new Date(),
      });
      await c.save();
    }
    res.json({ success: true, data: { classroomId: c._id, title: c.title } });
  } catch (err) { next(err); }
};

const heartbeat = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Tələbə profili tapılmadı.' });

    const p = c.participants.find(pp => String(pp.studentId) === String(student._id));
    if (!p) return res.status(404).json({ success: false, message: 'İştirakçı tapılmadı.' });

    p.lastHeartbeat = new Date();
    p.isPresent     = true;
    await c.save();
    res.json({ success: true, data: { alive: true } });
  } catch (err) { next(err); }
};

const end = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });
    if (String(c.teacherId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Yalnız müəllim dərsi bitirə bilər.' });
    }
    c.status      = 'ended';
    c.endedAt     = new Date();
    c.qrToken     = null;
    c.qrExpiresAt = null;
    await c.save();
    res.json({ success: true, data: { ended: true, participantCount: c.participants.length } });
  } catch (err) { next(err); }
};

const getAttendance = async (req, res, next) => {
  try {
    const c = await Classroom.findById(req.params.id).populate({
      path: 'participants.studentId',
      populate: { path: 'userId', select: 'name surname' },
    });
    if (!c) return res.status(404).json({ success: false, message: 'Dərs tapılmadı.' });

    const list = c.participants.map(p => {
      const s = p.studentId;
      const u = s?.userId;
      return {
        studentId:     s?._id,
        name:          [u?.name, u?.surname].filter(Boolean).join(' ') || 'Tələbə',
        joinedAt:      p.joinedAt,
        leftAt:        p.leftAt,
        isPresent:     p.isPresent,
        lastHeartbeat: p.lastHeartbeat,
      };
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

const listMine = async (req, res, next) => {
  try {
    let filter;
    if (req.user.role === 'teacher') {
      filter = { teacherId: req.user._id };
    } else if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user._id }).select('_id');
      if (!student) return res.json({ success: true, data: [] });

      const groupIds = await Group.distinct('_id', { studentIds: student._id });
      filter = {
        $or: [
          { 'participants.studentId': student._id },
          { groupId: { $in: groupIds } },
        ],
      };
    } else {
      filter = { _id: { $in: [] } };
    }
    const items = await Classroom.find(filter).sort({ scheduledAt: -1 }).limit(50);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

module.exports = {
  create, getById, start, join, scanQR, heartbeat, end, getAttendance, listMine,
};
