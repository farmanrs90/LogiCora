const User = require('../user/user.model');
const Course = require('../course/course.model');
const Group = require('../group/group.model');

// Yalnız mövcud User rollarından sayılır — uydurma rol/say yoxdur.
const ROLE_KEYS = ['student', 'teacher', 'parent', 'admin', 'manager'];

// ── Drilldown köməkçiləri ───────────────────────────────────────────────────

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

// Müəllim etiketi — populate olunmuş Teacher.displayName, yoxsa User.name+surname.
// Heç biri yoxdursa null qaytarır (uydurma yoxdur).
const teacherLabel = (teacherId) => {
  if (!teacherId || typeof teacherId !== 'object') return null;
  if (teacherId.displayName) return teacherId.displayName;
  const u = teacherId.userId;
  if (u && typeof u === 'object' && (u.name || u.surname)) {
    return `${u.name || ''} ${u.surname || ''}`.trim();
  }
  return null;
};

const TEACHER_POPULATE = {
  path: 'teacherId',
  select: 'displayName userId',
  populate: { path: 'userId', select: 'name surname' },
};

// Read-only platforma icmalı — yalnız real backend modellərindən real saylar.
const getOverview = async () => {
  const [roleAgg, totalUsers, recentUsers, courseCount, recentCourses, groupCount] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('name surname email role createdAt')
        .lean(),
      Course.countDocuments(),
      Course.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category isPublished createdAt')
        .lean(),
      Group.countDocuments(),
    ]);

  // Bütün rolları 0 ilə başlat, real aggregate nəticələrini üstünə yaz.
  const usersByRole = ROLE_KEYS.reduce((acc, role) => {
    acc[role] = 0;
    return acc;
  }, {});
  roleAgg.forEach((row) => {
    if (row && row._id && Object.prototype.hasOwnProperty.call(usersByRole, row._id)) {
      usersByRole[row._id] = row.count;
    }
  });

  return {
    totalUsers,
    usersByRole,
    recentUsers: recentUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      surname: u.surname,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    })),
    courses: {
      total: courseCount,
      recent: recentCourses.map((c) => ({
        _id: c._id,
        title: c.title,
        category: c.category,
        isPublished: c.isPublished,
        createdAt: c.createdAt,
      })),
    },
    groups: {
      total: groupCount,
    },
  };
};

// ── Read-only siyahılar (drilldown) ─────────────────────────────────────────

const listUsers = async ({ role, q, limit, page } = {}) => {
  const filter = {};
  if (role && ROLE_KEYS.includes(role)) filter.role = role;
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: rx }, { surname: rx }, { email: rx }];
  }

  const lim = clampLimit(limit);
  const pg = clampPage(page);

  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .select('name surname email role ageGroup createdAt') // password seçilmir
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: docs.map((u) => ({
      _id: u._id,
      name: u.name,
      surname: u.surname,
      email: u.email,
      role: u.role,
      ageGroup: u.ageGroup,
      createdAt: u.createdAt,
    })),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.max(1, Math.ceil(total / lim)),
  };
};

const listCourses = async ({ status, q, limit, page } = {}) => {
  const filter = {};
  if (status === 'published') filter.isPublished = true;
  else if (status === 'draft') filter.isPublished = false;
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ title: rx }, { category: rx }];
  }

  const lim = clampLimit(limit);
  const pg = clampPage(page);

  const [docs, total] = await Promise.all([
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .select('title category level isPublished price createdAt teacherId')
      .populate(TEACHER_POPULATE)
      .lean(),
    Course.countDocuments(filter),
  ]);

  return {
    items: docs.map((c) => ({
      _id: c._id,
      title: c.title,
      category: c.category,
      level: c.level,
      isPublished: c.isPublished,
      price: c.price,
      teacher: teacherLabel(c.teacherId),
      createdAt: c.createdAt,
    })),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.max(1, Math.ceil(total / lim)),
  };
};

const listGroups = async ({ limit, page } = {}) => {
  const lim = clampLimit(limit);
  const pg = clampPage(page);

  const [docs, total] = await Promise.all([
    Group.find()
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .select('name status studentIds createdAt teacherId')
      .populate(TEACHER_POPULATE)
      .lean(),
    Group.countDocuments(),
  ]);

  return {
    items: docs.map((g) => ({
      _id: g._id,
      name: g.name,
      status: g.status,
      studentCount: Array.isArray(g.studentIds) ? g.studentIds.length : 0,
      teacher: teacherLabel(g.teacherId),
      createdAt: g.createdAt,
    })),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.max(1, Math.ceil(total / lim)),
  };
};

module.exports = { getOverview, listUsers, listCourses, listGroups };
