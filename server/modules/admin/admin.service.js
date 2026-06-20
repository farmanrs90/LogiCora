const User = require('../user/user.model');
const Course = require('../course/course.model');
const Group = require('../group/group.model');

// Yalnız mövcud User rollarından sayılır — uydurma rol/say yoxdur.
const ROLE_KEYS = ['student', 'teacher', 'parent', 'admin', 'manager'];

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

module.exports = { getOverview };
