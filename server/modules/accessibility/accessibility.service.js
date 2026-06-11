const { AccessibilityConfig, SPECIAL_NEEDS_DEFAULTS } = require('./accessibility.model');
const User = require('../user/user.model');
const Parent = require('../parent/parent.model');
const Student = require('../student/student.model');

const getOrCreateConfig = async (userId) => {
  let config = await AccessibilityConfig.findOne({ userId });

  if (!config) {
    const user = await User.findById(userId).select('isSpecialNeeds specialNeedsType');

    const defaults =
      user?.isSpecialNeeds && user?.specialNeedsType
        ? SPECIAL_NEEDS_DEFAULTS[user.specialNeedsType] || {}
        : {};

    config = await AccessibilityConfig.create({ userId, ...defaults });
  }

  return config;
};

const getMyConfig = async (userId) => {
  const config = await getOrCreateConfig(userId);
  return config;
};

const updateMyConfig = async (userId, data) => {
  const config = await getOrCreateConfig(userId);

  const allowed = [
    'fontSize',
    'highContrast',
    'audioQuestions',
    'simplifiedUI',
    'noAnimations',
    'largeClickTargets',
    'keyboardOnly',
  ];

  allowed.forEach((key) => {
    if (data[key] !== undefined) config[key] = data[key];
  });

  await config.save();
  return config;
};

const createDefaultForNewUser = async (userId) => {
  const user = await User.findById(userId).select('isSpecialNeeds specialNeedsType');
  if (!user) return;

  const existing = await AccessibilityConfig.findOne({ userId });
  if (existing) return;

  const defaults =
    user.isSpecialNeeds && user.specialNeedsType
      ? SPECIAL_NEEDS_DEFAULTS[user.specialNeedsType] || {}
      : {};

  await AccessibilityConfig.create({ userId, ...defaults });
};

// ── Parent → child accessibility (ownership yoxlanır) ─────────────────────────
// Frontend "types" Azərbaycan etiketləri göndərir; User.specialNeedsType tək enum
// dəyər saxlayır (schema dəyişmir) → ilk seçimi uyğun enum dəyərinə map edirik.
const SPECIAL_NEEDS_TYPE_MAP = {
  Görmə: 'sensory',
  Eşitmə: 'sensory',
  İdrak: 'cognitive',
  Motor: 'physical',
  Digər: 'other',
};

const mapSpecialNeedsType = (types) => {
  if (!Array.isArray(types) || types.length === 0) return 'other';
  return SPECIAL_NEEDS_TYPE_MAP[types[0]] || 'other';
};

// childId Student._id (frontend bunu göndərir) və ya User._id ola bilər → uşağın
// User._id-sini qaytarır və parent ownership-i yoxlayır (parentin öz children siyahısı).
const resolveOwnedChildUserId = async (parentUserId, childId) => {
  const parent = await Parent.findOne({ userId: parentUserId });
  if (!parent) {
    const error = new Error('Valideyn profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }
  const student = await Student.findById(childId).select('userId');
  const childUserId = student ? student.userId : childId; // fallback: childId = User._id
  const owns = (parent.children || []).some((cid) => String(cid) === String(childUserId));
  if (!owns) {
    const error = new Error('Bu uşaq sizə aid deyil.');
    error.statusCode = 403;
    throw error;
  }
  return childUserId;
};

const getChildConfig = async (parentUserId, childId) => {
  const childUserId = await resolveOwnedChildUserId(parentUserId, childId);
  return getOrCreateConfig(childUserId);
};

const updateChildSpecialNeeds = async (parentUserId, childId, data) => {
  const childUserId = await resolveOwnedChildUserId(parentUserId, childId);

  const hasSpecialNeeds = !!data.hasSpecialNeeds;
  const specialNeedsType = hasSpecialNeeds ? mapSpecialNeedsType(data.types) : '';

  // Uşağın User sənədinə real yazılır (mövcud sahələr — schema dəyişmir).
  await User.findByIdAndUpdate(childUserId, { isSpecialNeeds: hasSpecialNeeds, specialNeedsType });

  // A11y konfiqurasiyasını təmin et (yoxdursa default yaradılır).
  const config = await getOrCreateConfig(childUserId);
  return config;
};

module.exports = {
  getMyConfig,
  updateMyConfig,
  createDefaultForNewUser,
  getChildConfig,
  updateChildSpecialNeeds,
};
