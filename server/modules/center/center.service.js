const EducationCenter = require('./center.model');
const CenterApplication = require('./centerApplication.model');
const Teacher = require('../teacher/teacher.model');
const User = require('../user/user.model');
const notificationService = require('../notification/notification.service');

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
  centerType: c.centerType || 'course_center',
  verificationLevel: c.verificationLevel || 'basic',
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
    .populate('educationCenterId', 'name slug city description centerType verificationLevel isActive')
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
    centerType: c.centerType || 'course_center',
    verificationLevel: c.verificationLevel || 'basic',
    isActive: c.isActive,
    createdAt: c.createdAt,
  }));
};

// ── Müraciət / təsdiq axını ──────────────────────────────────────────────────

const slugify = (text) =>
  String(text).toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-') || 'merkez';

// Unikal slug (mövcudsa sonluq əlavə edilir).
const uniqueSlug = async (name) => {
  const base = slugify(name);
  let slug = base;
  let i = 1;
  /* eslint-disable no-await-in-loop */
  while (await EducationCenter.findOne({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  /* eslint-enable no-await-in-loop */
  return slug;
};

// Unikal joinCode (CTR-XXXXXX). DB-də yoxlanılır.
const uniqueJoinCode = async () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let code = 'CTR-';
    for (let j = 0; j < 6; j += 1) code += charset[Math.floor(Math.random() * charset.length)];
    if (!(await EducationCenter.findOne({ joinCode: code }))) return code;
  }
  /* eslint-enable no-await-in-loop */
  // Çox nadir hal — vaxt damğası ilə fallback
  return `CTR-${Date.now().toString(36).toUpperCase()}`;
};

const shapeApplication = (a) => ({
  _id: a._id,
  centerName: a.centerName,
  centerType: a.centerType || 'individual_teacher',
  taxIdOrVoen: a.taxIdOrVoen || '',
  contactName: a.contactName || '',
  phone: a.phone || '',
  address: a.address || '',
  city: a.city || '',
  description: a.description || '',
  documentUrl: a.documentUrl || '',
  status: a.status,
  adminNote: a.adminNote || '',
  createdAt: a.createdAt,
  reviewedAt: a.reviewedAt || null,
});

// İstifadəçi müraciət göndərir. Pending/approved varsa təkrar müraciətə icazə verilmir.
const submitApplication = async (userId, body) => {
  const existing = await CenterApplication.findOne({
    applicantUser: userId,
    status: { $in: ['pending', 'approved'] },
  });
  if (existing) {
    const error = new Error(
      existing.status === 'approved'
        ? 'Artıq təsdiqlənmiş təhsil mərkəziniz var.'
        : 'Müraciətiniz artıq yoxlanılır.'
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('name surname email role').lean();

  const app = await CenterApplication.create({
    applicantUser: userId,
    applicantRole: user ? user.role : '',
    applicantName: user ? `${user.name || ''} ${user.surname || ''}`.trim() : '',
    applicantEmail: user ? user.email || '' : '',
    centerName: String(body.centerName).trim(),
    centerType: ['individual_teacher', 'course_center', 'school_or_org'].includes(body.centerType)
      ? body.centerType
      : 'individual_teacher',
    taxIdOrVoen: body.taxIdOrVoen ? String(body.taxIdOrVoen).trim() : '',
    documentUrl: body.documentUrl ? String(body.documentUrl).trim() : '',
    contactName: body.contactName ? String(body.contactName).trim() : '',
    phone: String(body.phone).trim(),
    address: String(body.address).trim(),
    city: body.city ? String(body.city).trim() : '',
    description: body.description ? String(body.description).trim() : '',
  });

  return shapeApplication(app);
};

// İstifadəçinin müraciət vəziyyəti (display + approved-da joinCode).
const getMyApplication = async (userId) => {
  const app = await CenterApplication.findOne({ applicantUser: userId })
    .sort({ createdAt: -1 })
    .lean();

  if (!app) return { status: 'none', application: null, center: null };

  if (app.status === 'approved' && app.createdCenterId) {
    const center = await EducationCenter.findById(app.createdCenterId).lean();
    return {
      status: 'approved',
      application: shapeApplication(app),
      center: center
        ? { _id: center._id, name: center.name, city: center.city || '', joinCode: center.joinCode, isActive: center.isActive, verificationLevel: center.verificationLevel || 'basic', centerType: center.centerType || 'course_center' }
        : null,
    };
  }

  return { status: app.status, application: shapeApplication(app), center: null };
};

// ── Admin ────────────────────────────────────────────────────────────────────

const STATUSES = ['pending', 'approved', 'rejected'];

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clampLimit = (limit) => {
  const n = parseInt(limit, 10);
  if (Number.isNaN(n) || n <= 0) return 20;
  return Math.min(n, 50);
};
const clampPage = (page) => {
  const n = parseInt(page, 10);
  return Number.isNaN(n) || n <= 0 ? 1 : n;
};

const shapeAdminApplication = (a) => ({
  ...shapeApplication(a),
  applicantName: a.applicantName || '',
  applicantEmail: a.applicantEmail || '',
  applicantRole: a.applicantRole || '',
  createdCenterId: a.createdCenterId || null,
});

const listApplications = async ({ status, q, page, limit } = {}) => {
  const filter = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ centerName: rx }, { applicantName: rx }, { applicantEmail: rx }];
  }
  const lim = clampLimit(limit);
  const pg = clampPage(page);

  const [docs, total] = await Promise.all([
    CenterApplication.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    CenterApplication.countDocuments(filter),
  ]);

  return {
    items: docs.map(shapeAdminApplication),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.max(1, Math.ceil(total / lim)),
  };
};

// Admin müraciəti təsdiqləyir/rədd edir. Təsdiqdə real aktiv mərkəz yaranır (idempotent).
const reviewApplication = async (adminUserId, applicationId, { status, adminNote, verificationLevel }) => {
  if (!['approved', 'rejected'].includes(status)) {
    const error = new Error('Status yalnız approved və ya rejected ola bilər.');
    error.statusCode = 400;
    throw error;
  }

  const app = await CenterApplication.findById(applicationId);
  if (!app) {
    const error = new Error('Müraciət tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  // Artıq təsdiqlənibsə təkrar mərkəz yaratma (idempotent).
  if (app.status === 'approved' && app.createdCenterId) {
    const center = await EducationCenter.findById(app.createdCenterId).lean();
    return {
      application: shapeAdminApplication(app.toObject()),
      center: center ? { _id: center._id, name: center.name, joinCode: center.joinCode, verificationLevel: center.verificationLevel || 'basic' } : null,
    };
  }

  if (status === 'approved') {
    const slug = await uniqueSlug(app.centerName);
    const joinCode = await uniqueJoinCode();
    // verified YALNIZ real sənəd (VÖEN və ya documentUrl) olduqda + admin seçdikdə. Fake yox.
    const hasProof = !!((app.taxIdOrVoen && String(app.taxIdOrVoen).trim()) || (app.documentUrl && String(app.documentUrl).trim()));
    const finalVerification = verificationLevel === 'verified' && hasProof ? 'verified' : 'basic';
    const center = await EducationCenter.create({
      name: app.centerName,
      slug,
      description: app.description || '',
      city: app.city || '',
      address: app.address || '',
      phone: app.phone || '',
      joinCode,
      ownerUserId: app.applicantUser,
      centerType: app.centerType || 'course_center',
      verificationLevel: finalVerification,
      isActive: true,
    });

    app.status = 'approved';
    app.adminNote = adminNote ? String(adminNote) : app.adminNote;
    app.reviewedBy = adminUserId;
    app.reviewedAt = new Date();
    app.createdCenterId = center._id;
    await app.save();

    try {
      await notificationService.send({
        userId: app.applicantUser,
        type: 'system',
        title: 'Təhsil mərkəzi müraciətiniz təsdiqləndi',
        message: `"${center.name}" mərkəzi yaradıldı. Qoşulma kodu: ${center.joinCode}. Bu kodu müəllimlərə paylaşın.`,
        meta: { centerId: String(center._id), joinCode: center.joinCode },
      });
    } catch { /* bildiriş xətası axını dayandırmır */ }

    return {
      application: shapeAdminApplication(app.toObject()),
      center: { _id: center._id, name: center.name, joinCode: center.joinCode, verificationLevel: center.verificationLevel },
    };
  }

  // rejected
  app.status = 'rejected';
  app.adminNote = adminNote ? String(adminNote) : '';
  app.reviewedBy = adminUserId;
  app.reviewedAt = new Date();
  await app.save();

  try {
    await notificationService.send({
      userId: app.applicantUser,
      type: 'system',
      title: 'Təhsil mərkəzi müraciətiniz rədd edildi',
      message: app.adminNote
        ? `Müraciətiniz rədd edildi. Qeyd: ${app.adminNote}`
        : 'Müraciətiniz rədd edildi.',
      meta: { applicationId: String(app._id) },
    });
  } catch { /* bildiriş xətası axını dayandırmır */ }

  return { application: shapeAdminApplication(app.toObject()), center: null };
};

module.exports = {
  findActiveByJoinCode,
  getPublicCenters,
  getMyCenter,
  getAdminCenters,
  submitApplication,
  getMyApplication,
  listApplications,
  reviewApplication,
};
