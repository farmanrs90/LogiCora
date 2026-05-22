const Portfolio = require('./portfolio.model');
const Student = require('../student/student.model');
const crypto = require('crypto');

const generateShareableLink = () => crypto.randomBytes(10).toString('hex');

const getOrCreatePortfolio = async (studentId) => {
  let portfolio = await Portfolio.findOne({ studentId });
  if (!portfolio) {
    portfolio = await Portfolio.create({
      studentId,
      shareableLink: generateShareableLink(),
    });
  }
  return portfolio;
};

const getMyPortfolio = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const portfolio = await getOrCreatePortfolio(student._id);
  return portfolio;
};

const getPortfolioByLink = async (shareableLink, viewer) => {
  const portfolio = await Portfolio.findOne({ shareableLink }).populate(
    'studentId',
    'userId grade school'
  );

  if (!portfolio) {
    const error = new Error('Portfolio tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  // Public visitors — isPublic check
  if (!viewer) {
    if (!portfolio.isPublic) {
      const error = new Error('Bu portfolio gizlidir.');
      error.statusCode = 403;
      throw error;
    }
    return portfolio;
  }

  // Admin və müəllim həmişə görür
  if (viewer.role === 'admin' || viewer.role === 'teacher') {
    return portfolio;
  }

  // Tələbənin özü
  if (viewer.role === 'student') {
    const student = await Student.findOne({ userId: viewer._id });
    if (student && student._id.toString() === portfolio.studentId._id.toString()) {
      return portfolio;
    }
  }

  // Valideyn — öz uşağının portfoliasunu görür
  if (viewer.role === 'parent') {
    const child = await Student.findOne({
      _id: portfolio.studentId._id,
      parentId: viewer._id,
    });
    if (child) return portfolio;
  }

  // Digərləri üçün isPublic yoxlanılır
  if (!portfolio.isPublic) {
    const error = new Error('Bu portfolio gizlidir.');
    error.statusCode = 403;
    throw error;
  }

  return portfolio;
};

const updateVisibility = async (userId, isPublic) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const portfolio = await getOrCreatePortfolio(student._id);
  portfolio.isPublic = isPublic;
  await portfolio.save();
  return portfolio;
};

const addTimelineEntry = async (studentId, entry) => {
  const portfolio = await getOrCreatePortfolio(studentId);

  portfolio.timeline.push({
    date: entry.date || new Date(),
    type: entry.type,
    title: entry.title,
    description: entry.description || '',
    xpEarned: entry.xpEarned || 0,
    verified: entry.verified || false,
  });

  // Update counters
  if (entry.type === 'course') portfolio.totalCourses += 1;
  if (entry.type === 'competition') portfolio.totalCompetitions += 1;

  // Recalculate topSubject from skillTree
  if (portfolio.skillTree.length > 0) {
    const top = portfolio.skillTree.reduce((a, b) => (a.xp >= b.xp ? a : b));
    portfolio.topSubject = top.subject;
  }

  await portfolio.save();
  return portfolio;
};

const updateSkillTree = async (studentId, subject, xpToAdd) => {
  const portfolio = await getOrCreatePortfolio(studentId);

  const skill = portfolio.skillTree.find((s) => s.subject === subject);
  if (skill) {
    skill.xp += xpToAdd;
    skill.level = Math.floor(skill.xp / 200) + 1;
  } else {
    portfolio.skillTree.push({ subject, xp: xpToAdd, level: 1 });
  }

  // Recalculate topSubject
  const top = portfolio.skillTree.reduce((a, b) => (a.xp >= b.xp ? a : b));
  portfolio.topSubject = top.subject;

  await portfolio.save();
  return portfolio;
};

const regenerateLink = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const portfolio = await getOrCreatePortfolio(student._id);
  portfolio.shareableLink = generateShareableLink();
  await portfolio.save();
  return portfolio;
};

module.exports = {
  getMyPortfolio,
  getPortfolioByLink,
  updateVisibility,
  addTimelineEntry,
  updateSkillTree,
  regenerateLink,
};
