const showcaseService = require('./showcase.service');

const getFeaturedTeachers = async (req, res) => {
  const teachers = await showcaseService.getFeaturedTeachers();
  res.status(200).json({ success: true, data: teachers, message: 'Featured müəllimlər alındı.' });
};

const getTeacherBySlug = async (req, res) => {
  const teacher = await showcaseService.getTeacherBySlug(req.params.slug);
  res.status(200).json({ success: true, data: teacher, message: 'Müəllim profili alındı.' });
};

const getTeacherCourses = async (req, res) => {
  const courses = await showcaseService.getTeacherCourses(req.params.slug);
  res.status(200).json({ success: true, data: courses, message: 'Müəllimin kursları alındı.' });
};

const getTeacherCompetitions = async (req, res) => {
  const competitions = await showcaseService.getTeacherCompetitions(req.params.slug);
  res.status(200).json({ success: true, data: competitions, message: 'Müəllimin yarışmaları alındı.' });
};

const updateShowcase = async (req, res) => {
  const teacher = await showcaseService.updateShowcase(req.user._id, req.body);
  res.status(200).json({ success: true, data: teacher, message: 'Storefront yeniləndi.' });
};

const featureTeacher = async (req, res) => {
  const teacher = await showcaseService.featureTeacher(req.params.id, req.body.days);
  res.status(200).json({ success: true, data: teacher, message: 'Müəllim featured edildi.' });
};

module.exports = {
  getFeaturedTeachers,
  getTeacherBySlug,
  getTeacherCourses,
  getTeacherCompetitions,
  updateShowcase,
  featureTeacher,
};
