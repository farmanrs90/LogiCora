const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');
const Assessment = require('../assessment/assessment.model');
const Submission = require('../assessment/submission.model');
const Attendance = require('../attendance/attendance.model');
const Payment = require('../payment/payment.model');
const Competition = require('../competition/competition.model');
const Gamification = require('../gamification/gamification.model');

const getStudentStats = async (studentId) => {
  const [submissions, attendanceSessions, gamification, competitions] = await Promise.all([
    Submission.find({ studentId }),
    Attendance.find({ 'records.studentId': studentId }),
    Gamification.findOne({ studentId }),
    Competition.find({ 'participants.studentId': studentId, status: 'finished' }),
  ]);

  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions
    ? Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / totalSubmissions)
    : 0;
  const passedCount = submissions.filter((s) => s.passed).length;

  const attendanceRecords = attendanceSessions.flatMap((s) =>
    s.records.filter((r) => r.studentId.toString() === studentId.toString())
  );
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const attendanceRate = attendanceRecords.length
    ? Math.round((presentCount / attendanceRecords.length) * 100)
    : 0;

  const competitionRanks = competitions
    .map((c) => {
      const p = c.participants.find((x) => x.studentId.toString() === studentId.toString());
      return p ? p.rank : null;
    })
    .filter(Boolean);

  const avgRank = competitionRanks.length
    ? Math.round(competitionRanks.reduce((a, b) => a + b, 0) / competitionRanks.length)
    : null;

  return {
    assessments: {
      total: totalSubmissions,
      passed: passedCount,
      failed: totalSubmissions - passedCount,
      avgScore,
    },
    attendance: {
      total: attendanceRecords.length,
      present: presentCount,
      rate: attendanceRate,
    },
    gamification: gamification
      ? {
          totalXP: gamification.totalXP,
          level: gamification.level,
          streak: gamification.streak,
          badges: gamification.badges.length,
          leagueTier: gamification.leagueTier,
        }
      : null,
    competitions: {
      total: competitions.length,
      avgRank,
    },
  };
};

const getGroupStats = async (groupId) => {
  const [assessments, attendanceSessions, payments] = await Promise.all([
    Assessment.find({ groupId }),
    Attendance.find({ groupId }),
    Payment.find({ groupId }),
  ]);

  const assessmentIds = assessments.map((a) => a._id);
  const submissions = await Submission.find({ assessmentId: { $in: assessmentIds } });

  const avgScore = submissions.length
    ? Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length)
    : 0;

  const totalRecords = attendanceSessions.flatMap((s) => s.records);
  const presentCount = totalRecords.filter((r) => r.status === 'present').length;
  const attendanceRate = totalRecords.length
    ? Math.round((presentCount / totalRecords.length) * 100)
    : 0;

  const paidPayments = payments.filter((p) => p.status === 'paid').length;
  const paymentRate = payments.length
    ? Math.round((paidPayments / payments.length) * 100)
    : 0;

  return {
    assessments: {
      total: assessments.length,
      totalSubmissions: submissions.length,
      avgScore,
    },
    attendance: {
      totalSessions: attendanceSessions.length,
      attendanceRate,
    },
    payments: {
      total: payments.length,
      paid: paidPayments,
      paymentRate,
    },
  };
};

const getPlatformStats = async () => {
  const [
    totalStudents,
    totalTeachers,
    totalAssessments,
    totalSubmissions,
    totalCompetitions,
    recentPayments,
  ] = await Promise.all([
    Student.countDocuments(),
    Teacher.countDocuments(),
    Assessment.countDocuments({ status: 'published' }),
    Submission.countDocuments(),
    Competition.countDocuments({ status: 'finished' }),
    Payment.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(10),
  ]);

  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  return {
    users: {
      students: totalStudents,
      teachers: totalTeachers,
    },
    content: {
      assessments: totalAssessments,
      submissions: totalSubmissions,
      competitions: totalCompetitions,
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      recentPayments,
    },
  };
};

module.exports = {
  getStudentStats,
  getGroupStats,
  getPlatformStats,
};
