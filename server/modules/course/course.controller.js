const courseService = require('./course.service');

const createCourse = async (req, res) => {
  const course = await courseService.createCourse(req.user._id, req.body);
  res.status(201).json({ success: true, data: course, message: 'Kurs yaradıldı.' });
};

const updateCourse = async (req, res) => {
  const course = await courseService.updateCourse(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, data: course, message: 'Kurs yeniləndi.' });
};

const publishCourse = async (req, res) => {
  const course = await courseService.publishCourse(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: course, message: 'Kurs yayımlandı.' });
};

const deleteCourse = async (req, res) => {
  await courseService.deleteCourse(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: null, message: 'Kurs silindi.' });
};

const getCourses = async (req, res) => {
  const courses = await courseService.getCourses(req.query);
  res.status(200).json({ success: true, data: courses, message: 'Kurslar alındı.' });
};

const getCourseById = async (req, res) => {
  const result = await courseService.getCourseById(req.params.id);
  res.status(200).json({ success: true, data: result, message: 'Kurs alındı.' });
};

const addLesson = async (req, res) => {
  const lesson = await courseService.addLesson(req.user._id, req.params.id, req.body);
  res.status(201).json({ success: true, data: lesson, message: 'Dərs əlavə edildi.' });
};

const enrollStudent = async (req, res) => {
  const enrollment = await courseService.enrollStudent(req.student, req.body.courseId);
  const pending = enrollment && enrollment.status === 'pending_payment';
  res.status(201).json({
    success: true,
    data: enrollment,
    message: pending
      ? 'Qoşulma sorğusu qeydə alındı. Ödəniş/təsdiq gözlənilir.'
      : 'Kursa qeydiyyat tamamlandı.',
  });
};

const completeLesson = async (req, res) => {
  const enrollment = await courseService.completeLesson(
    req.student,
    req.params.id,
    req.body.lessonId
  );
  res.status(200).json({ success: true, data: enrollment, message: 'Dərs tamamlandı.' });
};

const getMyEnrollments = async (req, res) => {
  const enrollments = await courseService.getMyEnrollments(req.student);
  res.status(200).json({ success: true, data: enrollments, message: 'Qeydiyyatlar alındı.' });
};

module.exports = {
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
  getCourses,
  getCourseById,
  addLesson,
  enrollStudent,
  completeLesson,
  getMyEnrollments,
};
