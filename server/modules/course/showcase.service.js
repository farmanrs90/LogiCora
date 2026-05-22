const Teacher = require('../teacher/teacher.model');
const Course = require('./course.model');
const Competition = require('../competition/competition.model');

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

const getFeaturedTeachers = async () => {
  const now = new Date();
  const teachers = await Teacher.find({
    isFeatured: true,
    featuredUntil: { $gte: now },
    isVerified: true,
  })
    .populate('userId', 'name surname')
    .select('-totalRevenue');

  return teachers;
};

const getTeacherBySlug = async (slug) => {
  const teacher = await Teacher.findOne({ slug, isVerified: true })
    .populate('userId', 'name surname')
    .select('-totalRevenue');

  if (!teacher) {
    const error = new Error('Müəllim tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  return teacher;
};

const getTeacherCourses = async (slug) => {
  const teacher = await Teacher.findOne({ slug, isVerified: true });
  if (!teacher) {
    const error = new Error('Müəllim tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const courses = await Course.find({ teacherId: teacher._id, isPublished: true })
    .sort({ isFeatured: -1, totalEnrolled: -1 });

  return courses;
};

const getTeacherCompetitions = async (slug) => {
  const teacher = await Teacher.findOne({ slug, isVerified: true });
  if (!teacher) {
    const error = new Error('Müəllim tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const competitions = await Competition.find({
    createdBy: teacher.userId,
    status: 'finished',
  })
    .sort({ finishedAt: -1 })
    .limit(20);

  return competitions;
};

const updateShowcase = async (userId, data) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) {
    const error = new Error('Müəllim profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  if (data.displayName && !data.slug) {
    data.slug = slugify(data.displayName);
  } else if (data.slug) {
    data.slug = slugify(data.slug);
  }

  // Check slug uniqueness if slug is being changed
  if (data.slug && data.slug !== teacher.slug) {
    const exists = await Teacher.findOne({ slug: data.slug });
    if (exists) {
      const error = new Error('Bu slug artıq istifadə olunur. Başqa bir ad seçin.');
      error.statusCode = 400;
      throw error;
    }
  }

  const allowed = [
    'displayName', 'slug', 'coverImage', 'introVideo',
    'socialLinks', 'achievements', 'centerName', 'centerLogo',
  ];

  allowed.forEach((key) => {
    if (data[key] !== undefined) teacher[key] = data[key];
  });

  await teacher.save();
  return teacher;
};

const featureTeacher = async (teacherId, days) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    const error = new Error('Müəllim tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const until = new Date();
  until.setDate(until.getDate() + days);

  teacher.isFeatured = true;
  teacher.featuredUntil = until;
  await teacher.save();

  return teacher;
};

module.exports = {
  getFeaturedTeachers,
  getTeacherBySlug,
  getTeacherCourses,
  getTeacherCompetitions,
  updateShowcase,
  featureTeacher,
};
