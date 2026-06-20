require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const studentRoutes = require('./modules/student/student.routes');
const teacherRoutes = require('./modules/teacher/teacher.routes');
const parentRoutes = require('./modules/parent/parent.routes');
const groupRoutes = require('./modules/group/group.routes');
const assessmentRoutes = require('./modules/assessment/assessment.routes');
const gamificationRoutes = require('./modules/gamification/gamification.routes');
const questionRoutes = require('./modules/question/question.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const competitionRoutes = require('./modules/competition/competition.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const dailyQuestionRoutes = require('./modules/dailyQuestion/dailyQuestion.routes');
const courseRoutes = require('./modules/course/course.routes');
const showcaseRoutes = require('./modules/course/showcase.routes');
const inviteRoutes = require('./modules/invite/invite.routes');
const clanRoutes = require('./modules/clan/clan.routes');
const portfolioRoutes = require('./modules/portfolio/portfolio.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const accessibilityRoutes = require('./modules/accessibility/accessibility.routes');
const eloRoutes = require('./modules/elo/elo.routes');
const streakFreezeRoutes = require('./modules/streakFreeze/streakFreeze.routes');
const weeklyMysteryRoutes = require('./modules/weeklyMystery/weeklyMystery.routes');
const kidsRoutes = require('./modules/kids/kids.routes');
const classroomRoutes = require('./modules/classroom/classroom.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const feedbackRoutes = require('./modules/feedback/feedback.routes');
const resultsRoutes = require('./modules/results/results.routes');
const helmet = require('helmet');
const http = require('http');
const { initSocket } = require('./socket');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
// Frontend bütün parent çağırışlarını tək formada (/api/parent/...) edir.
// Mövcud plural mount saxlanılır, əlavə singular alias 404-ları bitirir (heç bir route silinmir).
app.use('/api/parent', parentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/daily', dailyQuestionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teachers', showcaseRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/accessibility', accessibilityRoutes);
app.use('/api/elo', eloRoutes);
app.use('/api/streak-freeze', streakFreezeRoutes);
app.use('/api/weekly-mystery', weeklyMysteryRoutes);
app.use('/api/kids', kidsRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/results', resultsRoutes);

// Heç bir route uyğun gəlməyəndə (ilişməsin, aydın 404 versin)
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route tapilmadi: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);



app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
start();
