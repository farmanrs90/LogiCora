const Feedback = require('./feedback.model');

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

// İstifadəçinin öz feedback-i — yalnız ona aid sahələr.
const shapeOwn = (d) => ({
  _id: d._id,
  category: d.category,
  type: d.type,
  title: d.title,
  message: d.message,
  priority: d.priority,
  status: d.status,
  adminNote: d.adminNote || '',
  createdAt: d.createdAt,
});

// Admin görünüşü — göndərənin yalnız display sahələri (parol/şəxsi data yox).
const userLabel = (u) => {
  if (!u || typeof u !== 'object') return null;
  const fullName = `${u.name || ''} ${u.surname || ''}`.trim();
  return {
    _id: u._id,
    name: fullName || null,
    email: u.email || null,
    role: u.role || null,
  };
};

const shapeAdmin = (d) => ({
  _id: d._id,
  category: d.category,
  type: d.type,
  title: d.title,
  message: d.message,
  priority: d.priority,
  status: d.status,
  adminNote: d.adminNote || '',
  role: d.role,
  createdAt: d.createdAt,
  handledAt: d.handledAt,
  user: userLabel(d.user),
  handledBy: d.handledBy && typeof d.handledBy === 'object'
    ? (`${d.handledBy.name || ''} ${d.handledBy.surname || ''}`.trim() || null)
    : null,
});

const ADMIN_POPULATE_USER = { path: 'user', select: 'name surname email role' };
const ADMIN_POPULATE_HANDLER = { path: 'handledBy', select: 'name surname' };

// Rol client-dən deyil, çağırışda req.user.role-dan ötürülür.
const createFeedback = async (userId, role, body) => {
  const doc = await Feedback.create({
    user: userId,
    role,
    category: body.category,
    type: body.type,
    priority: body.priority || 'medium',
    title: String(body.title).trim(),
    message: String(body.message).trim(),
  });
  return shapeOwn(doc);
};

const getMyFeedback = async (userId) => {
  const docs = await Feedback.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return docs.map(shapeOwn);
};

const adminList = async ({ status, category, role, q, page, limit } = {}) => {
  const filter = {};
  if (status && Feedback.STATUSES.includes(status)) filter.status = status;
  if (category && Feedback.CATEGORIES.includes(category)) filter.category = category;
  if (role && Feedback.ROLES.includes(role)) filter.role = role;
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ title: rx }, { message: rx }];
  }

  const lim = clampLimit(limit);
  const pg = clampPage(page);

  const [docs, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .populate(ADMIN_POPULATE_USER)
      .populate(ADMIN_POPULATE_HANDLER)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return {
    items: docs.map(shapeAdmin),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.max(1, Math.ceil(total / lim)),
  };
};

const adminUpdateStatus = async (id, adminId, body) => {
  const update = {
    status: body.status,
    handledBy: adminId,
    handledAt: new Date(),
  };
  if (body.adminNote !== undefined) update.adminNote = String(body.adminNote);

  const doc = await Feedback.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  )
    .populate(ADMIN_POPULATE_USER)
    .populate(ADMIN_POPULATE_HANDLER)
    .lean();

  if (!doc) {
    const error = new Error('Feedback tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  return shapeAdmin(doc);
};

module.exports = { createFeedback, getMyFeedback, adminList, adminUpdateStatus };
