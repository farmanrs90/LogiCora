const Invite = require('./invite.model');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');
const Course = require('../course/course.model');
const Enrollment = require('../course/enrollment.model');
const notificationService = require('../notification/notification.service');

const INVITE_EXPIRE_DAYS = 7;

const sendInvite = async (userId, { studentId, courseId, message, discountCode, discountPercent }) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findOne({ _id: courseId, teacherId: teacher._id, isPublished: true });
  if (!course) {
    const error = new Error('Kurs tapılmadı və ya sizə aid deyil.');
    error.statusCode = 404;
    throw error;
  }

  const student = await Student.findById(studentId);
  if (!student) {
    const error = new Error('Tələbə tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const alreadyEnrolled = await Enrollment.findOne({ studentId, courseId });
  if (alreadyEnrolled) {
    const error = new Error('Tələbə bu kursa artıq qeydiyyatdan keçib.');
    error.statusCode = 400;
    throw error;
  }

  const existingInvite = await Invite.findOne({ teacherId: teacher._id, studentId, courseId, status: 'pending' });
  if (existingInvite) {
    const error = new Error('Bu tələbəyə bu kurs üçün artıq dəvət göndərilmişdir.');
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRE_DAYS);

  const invite = await Invite.create({
    teacherId: teacher._id,
    studentId,
    courseId,
    message: message || '',
    discountCode: discountCode || null,
    discountPercent: discountPercent || 0,
    expiresAt,
  });

  await notificationService.createNotification({
    userId: student.userId,
    type: 'invite',
    title: 'Yeni dəvət',
    message: `Müəllim sizi "${course.title}" kursuna dəvət etdi.`,
    data: { inviteId: invite._id },
  });

  return invite;
};

const respondToInvite = async (userId, inviteId, status) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const invite = await Invite.findOne({ _id: inviteId, studentId: student._id, status: 'pending' });
  if (!invite) {
    const error = new Error('Dəvət tapılmadı və ya artıq cavablandırılıb.');
    error.statusCode = 404;
    throw error;
  }

  if (new Date() > invite.expiresAt) {
    const error = new Error('Dəvətin müddəti bitib.');
    error.statusCode = 400;
    throw error;
  }

  invite.status = status;
  await invite.save();

  if (status === 'accepted') {
    const alreadyEnrolled = await Enrollment.findOne({
      studentId: student._id,
      courseId: invite.courseId,
    });

    if (!alreadyEnrolled) {
      await Enrollment.create({
        studentId: student._id,
        courseId: invite.courseId,
        paymentId: null,
      });

      await Course.findByIdAndUpdate(invite.courseId, { $inc: { totalEnrolled: 1 } });
    }
  }

  return invite;
};

const getMyInvites = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const invites = await Invite.find({ studentId: student._id })
    .populate('teacherId', 'displayName slug rating')
    .populate('courseId', 'title thumbnail price')
    .sort({ createdAt: -1 });

  return invites;
};

const getSentInvites = async (userId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const invites = await Invite.find({ teacherId: teacher._id })
    .populate('studentId', 'userId grade school')
    .populate('courseId', 'title thumbnail')
    .sort({ createdAt: -1 });

  return invites;
};

module.exports = {
  sendInvite,
  respondToInvite,
  getMyInvites,
  getSentInvites,
};
