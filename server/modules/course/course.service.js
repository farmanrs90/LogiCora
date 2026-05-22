const Course = require('./course.model');
const Lesson = require('./lesson.model');
const Enrollment = require('./enrollment.model');
const Teacher = require('../teacher/teacher.model');

const createCourse = async (userId, data) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  if (!teacher.canPublish) {
    const error = new Error('Kurs yaratmaq üçün admin təsdiqi lazımdır.');
    error.statusCode = 403;
    throw error;
  }

  const course = await Course.create({ ...data, teacherId: teacher._id });
  return course;
};

const updateCourse = async (userId, courseId, data) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findOne({ _id: courseId, teacherId: teacher._id });
  if (!course) {
    const error = new Error('Kurs tapılmadı və ya sizə aid deyil.');
    error.statusCode = 404;
    throw error;
  }

  Object.assign(course, data);
  await course.save();
  return course;
};

const publishCourse = async (userId, courseId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findOne({ _id: courseId, teacherId: teacher._id });
  if (!course) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const lessonCount = await Lesson.countDocuments({ courseId: course._id });
  if (lessonCount === 0) {
    const error = new Error('Ən azı 1 dərs əlavə etmədən kurs yayımlana bilməz.');
    error.statusCode = 400;
    throw error;
  }

  course.isPublished = true;
  await course.save();
  return course;
};

const deleteCourse = async (userId, courseId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findOne({ _id: courseId, teacherId: teacher._id });
  if (!course) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  await Lesson.deleteMany({ courseId: course._id });
  await Enrollment.deleteMany({ courseId: course._id });
  await course.deleteOne();
};

const getCourses = async (filters = {}) => {
  const query = { isPublished: true };

  if (filters.category) query.category = filters.category;
  if (filters.level) query.level = filters.level;
  if (filters.language) query.language = filters.language;
  if (filters.ageGroup) query.ageGroup = filters.ageGroup;
  if (filters.search) query.title = { $regex: filters.search, $options: 'i' };

  const courses = await Course.find(query)
    .populate('teacherId', 'userId specialization rating')
    .sort({ isFeatured: -1, totalEnrolled: -1, createdAt: -1 });

  return courses;
};

const getCourseById = async (courseId) => {
  const course = await Course.findById(courseId)
    .populate('teacherId', 'userId specialization rating bio');
  if (!course || !course.isPublished) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
  return { course, lessons };
};

const addLesson = async (userId, courseId, data) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findOne({ _id: courseId, teacherId: teacher._id });
  if (!course) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const lastLesson = await Lesson.findOne({ courseId }).sort({ order: -1 });
  const order = lastLesson ? lastLesson.order + 1 : 1;

  const lesson = await Lesson.create({ ...data, courseId, order });

  // Recalculate total duration
  const allLessons = await Lesson.find({ courseId });
  course.totalDuration = allLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  await course.save();

  return lesson;
};

const enrollStudent = async (student, courseId, paymentId = null) => {
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Enrollment.findOne({ studentId: student._id, courseId });
  if (existing) {
    const error = new Error('Bu kursa artıq qeydiyyatdan keçmisiniz.');
    error.statusCode = 400;
    throw error;
  }

  const enrollment = await Enrollment.create({
    studentId: student._id,
    courseId,
    paymentId,
  });

  course.totalEnrolled += 1;
  await course.save();

  return enrollment;
};

const completeLesson = async (student, courseId, lessonId) => {
  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId });
  if (!enrollment) {
    const error = new Error('Bu kursa qeydiyyatınız yoxdur.');
    error.statusCode = 403;
    throw error;
  }

  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson) {
    const error = new Error('Dərs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const alreadyDone = enrollment.completedLessons.some(
    (id) => id.toString() === lessonId.toString()
  );
  if (!alreadyDone) {
    enrollment.completedLessons.push(lessonId);
  }

  const totalLessons = await Lesson.countDocuments({ courseId });
  enrollment.progress = Math.round((enrollment.completedLessons.length / totalLessons) * 100);

  if (enrollment.progress === 100 && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();
  return enrollment;
};

const getMyEnrollments = async (student) => {
  const enrollments = await Enrollment.find({ studentId: student._id })
    .populate('courseId', 'title thumbnail totalDuration rating teacherId');
  return enrollments;
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
