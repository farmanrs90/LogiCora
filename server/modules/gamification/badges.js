const BADGES = {
  FIRST_STEP: {
    id: 'first_step',
    name: 'First Step',
    description: 'Complete your first assessment',
  },
  PERFECT: {
    id: 'perfect',
    name: 'Perfect',
    description: 'Score 100% on any assessment',
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'On Fire',
    description: '7 days in a row',
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Unstoppable',
    description: '30 days in a row',
  },
  CENTURY: {
    id: 'century',
    name: 'Century',
    description: 'Earn 100 total XP',
  },
  MASTER: {
    id: 'master',
    name: 'Master',
    description: 'Earn 1000 total XP',
  },
  LEGEND: {
    id: 'legend',
    name: 'Legend',
    description: 'Earn 5000 total XP',
  },
};

const ALL_BADGES = Object.values(BADGES);

module.exports = { BADGES, ALL_BADGES };
