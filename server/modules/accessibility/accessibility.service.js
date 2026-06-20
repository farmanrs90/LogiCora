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

// Uşaq konfiqurasiyasını + saxlanmış xüsusi dəstək seçimini birlikdə qaytarır
// (frontend yenidən açanda real prefill üçün — fake state yox).
const shapeChildConfig = (config, hasSpecialNeeds) => ({
  ...config.toObject(),
  hasSpecialNeeds: !!hasSpecialNeeds,
  specialNeedsTypes: Array.isArray(config.specialNeedsTypes) ? config.specialNeedsTypes : [],
});

const getChildConfig = async (parentUserId, childId) => {
  const childUserId = await resolveOwnedChildUserId(parentUserId, childId);
  const config = await getOrCreateConfig(childUserId);
  const child = await User.findById(childUserId).select('isSpecialNeeds');
  return shapeChildConfig(config, child?.isSpecialNeeds);
};

const updateChildSpecialNeeds = async (parentUserId, childId, data) => {
  const childUserId = await resolveOwnedChildUserId(parentUserId, childId);

  const hasSpecialNeeds = !!data.hasSpecialNeeds;
  const types = hasSpecialNeeds && Array.isArray(data.types) ? data.types : [];
  const specialNeedsType = hasSpecialNeeds ? mapSpecialNeedsType(types) : '';

  // Uşağın User sənədinə real yazılır (mövcud tək-enum sahə — geri-uyğunluq üçün saxlanır).
  await User.findByIdAndUpdate(childUserId, { isSpecialNeeds: hasSpecialNeeds, specialNeedsType });

  // A11y konfiqurasiyasını təmin et + tam multi-select seçimini real saxla.
  const config = await getOrCreateConfig(childUserId);
  config.specialNeedsTypes = types;
  await config.save();

  return shapeChildConfig(config, hasSpecialNeeds);
};

module.exports = {
  getMyConfig,
  updateMyConfig,
  createDefaultForNewUser,
  getChildConfig,
  updateChildSpecialNeeds,
};
