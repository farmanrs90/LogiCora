const StreakFreeze = require('./streakFreeze.model');
const Student = require('../student/student.model');
const Gamification = require('../gamification/gamification.model');

const FREEZE_COST_GEMS = 50;
const MAX_FREEZES = 3;

const getOrCreate = async (studentId) => {
  let freeze = await StreakFreeze.findOne({ studentId });
  if (!freeze) {
    freeze = await StreakFreeze.create({ studentId });
  }
  return freeze;
};

const getMyFreeze = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const freeze = await getOrCreate(student._id);
  return freeze;
};

const buyFreeze = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const profile = await Gamification.findOne({ studentId: student._id });
  if (!profile) {
    const error = new Error('Gamification profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  if (profile.gems < FREEZE_COST_GEMS) {
    const error = new Error(`Kifayət qədər gem yoxdur. Lazım olan: ${FREEZE_COST_GEMS} gem.`);
    error.statusCode = 400;
    throw error;
  }

  const freeze = await getOrCreate(student._id);

  if (freeze.freezesOwned >= MAX_FREEZES) {
    const error = new Error(`Maksimum ${MAX_FREEZES} freeze saxlaya bilərsiniz.`);
    error.statusCode = 400;
    throw error;
  }

  profile.gems -= FREEZE_COST_GEMS;
  await profile.save();

  freeze.freezesOwned += 1;
  freeze.history.push({
    action: 'bought',
    date: new Date(),
    gemsCost: FREEZE_COST_GEMS,
  });

  await freeze.save();

  return { freeze, gemsLeft: profile.gems };
};

const activateFreeze = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    const error = new Error('Tələbə profili tapılmadı.');
    error.statusCode = 404;
    throw error;
  }

  const freeze = await getOrCreate(student._id);

  if (freeze.freezesOwned <= 0) {
    const error = new Error('Freeze yoxdur. Əvvəlcə gem ilə alın.');
    error.statusCode = 400;
    throw error;
  }

  if (freeze.activeUntil && freeze.activeUntil > new Date()) {
    const error = new Error('Freeze artıq aktivdir.');
    error.statusCode = 400;
    throw error;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  freeze.freezesOwned -= 1;
  freeze.freezesUsed += 1;
  freeze.activeUntil = tomorrow;
  freeze.history.push({
    action: 'used',
    date: new Date(),
    gemsCost: 0,
  });

  await freeze.save();
  return freeze;
};

const isFreezeActive = async (studentId) => {
  const freeze = await StreakFreeze.findOne({ studentId });
  if (!freeze || !freeze.activeUntil) return false;
  return freeze.activeUntil > new Date();
};

module.exports = {
  getMyFreeze,
  buyFreeze,
  activateFreeze,
  isFreezeActive,
};
