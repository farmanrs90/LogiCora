const Course = require('./course.model');
const Lesson = require('./lesson.model');
const Enrollment = require('./enrollment.model');
const Teacher = require('../teacher/teacher.model');
const Student = require('../student/student.model');
const Parent = require('../parent/parent.model');
const notificationService = require('../notification/notification.service');

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

const getLessonAccessForCourse = async (course, requesterUserId) => {
  if ((course.price || 0) <= 0) {
    return { canViewLessons: true, lessonsLocked: false };
  }

  if (!requesterUserId) {
    return { canViewLessons: false, lessonsLocked: true, lockReason: 'enrollment_required' };
  }

  const ownerUserId = course.teacherId && course.teacherId.userId;
  if (ownerUserId && String(ownerUserId) === String(requesterUserId)) {
    return { canViewLessons: true, lessonsLocked: false };
  }

  const student = await Student.findOne({ userId: requesterUserId }).select('_id');
  if (!student) {
    return { canViewLessons: false, lessonsLocked: true, lockReason: 'enrollment_required' };
  }

  const enrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId: course._id,
  }).select('status');

  if (enrollment && enrollment.status === 'active') {
    return { canViewLessons: true, lessonsLocked: false };
  }

  return {
    canViewLessons: false,
    lessonsLocked: true,
    lockReason: enrollment && enrollment.status === 'pending_payment'
      ? 'payment_required'
      : 'enrollment_required',
  };
};

const getCourseById = async (courseId, requesterUserId = null) => {
  const course = await Course.findById(courseId)
    .populate('teacherId', 'userId specialization rating bio');
  if (!course) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  // Qaralama (publish olunmamış) kurs yalnız SAHİB müəllimə görünür (redaktə üçün).
  // Başqa hər kəs üçün 404 — ictimai görünmə davranışı dəyişmir.
  if (!course.isPublished) {
    const ownerUserId = course.teacherId && course.teacherId.userId;
    const isOwner = requesterUserId && ownerUserId && String(ownerUserId) === String(requesterUserId);
    if (!isOwner) {
      const error = new Error('Kurs tapılmadı.');
      error.statusCode = 404;
      throw error;
    }
  }

  const access = await getLessonAccessForCourse(course, requesterUserId);
  if (!access.canViewLessons) {
    return {
      course,
      lessons: [],
      lessonsLocked: true,
      lockReason: access.lockReason,
    };
  }

  const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
  return { course, lessons, lessonsLocked: false };
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

// Pullu kursda valideynə real bildiriş — əlaqə (Parent.children) varsa.
// Bildiriş uğursuz olsa belə qeydiyyat sorğusu pozulmur.
const notifyParentOfPaidEnrollment = async (student, course) => {
  try {
    const parent = await Parent.findOne({ children: student.userId }).select('userId');
    if (!parent) return;
    await notificationService.send({
      userId: parent.userId,
      type: 'payment_due',
      title: 'Kurs üçün ödəniş/təsdiq gözlənilir',
      message: `Övladınız "${course.title}" pullu kursuna qoşulmaq istəyir (${course.price} ₼). Ödəniş və ya təsdiq gözlənilir.`,
      meta: { courseId: String(course._id), price: course.price },
    });
  } catch {
    // Bildiriş xətası qeydiyyat axınını dayandırmır.
  }
};

const enrollStudent = async (student, courseId) => {
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    const error = new Error('Kurs tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Enrollment.findOne({ studentId: student._id, courseId });
  if (existing) {
    return {
      ...existing.toObject(),
      alreadyEnrolled: true,
      message: 'Already enrolled',
    };
  }

  // Pulsuz (price=0) → aktiv; pullu (price>0) → pending_payment (giriş açılmır).
  const isPaid = (course.price || 0) > 0;
  const status = isPaid ? 'pending_payment' : 'active';

  let enrollment;
  try {
    enrollment = await Enrollment.create({
      studentId: student._id,
      courseId,
      status,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const existingAfterRace = await Enrollment.findOne({ studentId: student._id, courseId });
      if (existingAfterRace) {
        return {
          ...existingAfterRace.toObject(),
          alreadyEnrolled: true,
          message: 'Already enrolled',
        };
      }
    }
    throw error;
  }

  if (isPaid) {
    // Pullu: giriş AÇILMIR, enrolled sayı artmır; valideynə real bildiriş göndərilir.
    await notifyParentOfPaidEnrollment(student, course);
  } else {
    // Pulsuz: dərhal aktiv qeydiyyat.
    course.totalEnrolled += 1;
    await course.save();
  }

  return enrollment;
};

const completeLesson = async (student, courseId, lessonId) => {
  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId });
  // Pullu kursun dərsləri ödəniş/təsdiqdən (status 'active') əvvəl açılmır.
  if (!enrollment || enrollment.status !== 'active') {
    const error = new Error('Bu kursa aktiv qeydiyyatınız yoxdur. Pullu kurslar ödəniş/təsdiqdən sonra açılır.');
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
    .populate('courseId', 'title thumbnail totalDuration rating teacherId price');
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
