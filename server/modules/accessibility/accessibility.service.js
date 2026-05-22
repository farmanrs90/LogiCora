const { AccessibilityConfig, SPECIAL_NEEDS_DEFAULTS } = require('./accessibility.model');
const User = require('../user/user.model');

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

module.exports = {
  getMyConfig,
  updateMyConfig,
  createDefaultForNewUser,
};
