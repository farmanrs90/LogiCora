const EducationCenter = require('./center.model');
const Teacher = require('../teacher/teacher.model');

// joinCode ilə AKTIV mərkəzi tap (qeydiyyatda müəllim bağlanması üçün). Yoxdursa null.
const findActiveByJoinCode = async (joinCode) => {
  if (!joinCode || !String(joinCode).trim()) return null;
  return EducationCenter.findOne({ joinCode: String(joinCode).trim(), isActive: true });
};

// Mərkəzi yalnız ictimai/display sahələri ilə formala (joinCode HEÇ VAXT açılmır).
const publicShape = (c) => ({
  _id: c._id,
  name: c.name,
  slug: c.slug,
  city: c.city || '',
  description: c.description || '',
  isActive: c.isActive,
});

// İctimai siyahı — yalnız aktiv mərkəzlər, joinCode-suz (display üçün).
const getPublicCenters = async () => {
  const centers = await EducationCenter.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
  return centers.map(publicShape);
};

// Müəllimin öz mərkəzi (varsa) + status. Müəllim profili yoxdursa independent.
const getMyCenter = async (teacherUserId) => {
  const teacher = await Teacher.findOne({ userId: teacherUserId })
    .populate('educationCenterId', 'name slug city description isActive')
    .lean();

  if (!teacher || !teacher.educationCenterId) {
    return { center: null, status: 'independent' };
  }
  const c = teacher.educationCenterId;
  return {
    center: publicShape(c),
    status: teacher.centerJoinStatus || 'active',
  };
};

// Admin read-only siyahı (joinCode daxildir — yalnız admin görür).
const getAdminCenters = async () => {
  const centers = await EducationCenter.find().sort({ createdAt: -1 }).lean();
  return centers.map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    city: c.city || '',
    joinCode: c.joinCode,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }));
};

module.exports = { findActiveByJoinCode, getPublicCenters, getMyCenter, getAdminCenters };
