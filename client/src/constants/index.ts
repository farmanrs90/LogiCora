export const API_ROUTES = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // User
  USER: {
    PROFILE: '/users/profile',
    UPDATE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },

  // Courses
  COURSES: {
    LIST: '/courses',
    FEATURED: '/courses/featured',
    BY_ID: (id: string) => `/courses/${id}`,
    CREATE: '/courses',
    UPDATE: (id: string) => `/courses/${id}`,
    PUBLISH: (id: string) => `/courses/${id}/publish`,
    DELETE: (id: string) => `/courses/${id}`,
    ADD_LESSON: (id: string) => `/courses/${id}/lessons`,
    ENROLL: '/courses/enroll',
    COMPLETE_LESSON: (id: string) => `/courses/${id}/complete-lesson`,
    MY_ENROLLMENTS: '/courses/my/enrollments',
    REVIEWS:    (id: string) => `/courses/${id}/reviews`,
    CERTIFICATE: (id: string) => `/courses/${id}/certificate`,
  },

  // Competitions
  COMPETITIONS: {
    BY_ID:    (id: string) => `/competitions/${id}`,
    RESULTS:  (id: string) => `/competitions/${id}/results`,
    COMPLETE: (id: string) => `/competitions/${id}/complete`,
    ACTIVE:   '/competitions/active',
  },

  // Daily Questions
  DAILY: {
    GET: '/daily',
    ANSWER: '/daily/answer',
    STATUS: '/daily/status',
  },

  // Teachers
  TEACHERS: {
    FEATURED: '/teachers/featured',
    BY_SLUG: (slug: string) => `/teachers/${slug}`,
    COURSES: (slug: string) => `/teachers/${slug}/courses`,
    UPDATE_SHOWCASE: '/teachers/me/showcase',
    COMPETITIONS: (slug: string) => `/teachers/${slug}/competitions`,
    REVIEWS:      (slug: string) => `/teachers/${slug}/reviews`,
  },

  // Clans
  CLANS: {
    LEADERBOARD: '/clans/leaderboard',
    BY_SLUG:   (slug: string) => `/clans/${slug}`,
    MEMBERS:   (slug: string) => `/clans/${slug}/members`,
    BATTLES:   (slug: string) => `/clans/${slug}/battles`,
    STATS:     (slug: string) => `/clans/${slug}/stats`,
    SEARCH:    '/clans',
    CREATE:    '/clans',
    JOIN:      (id: string) => `/clans/${id}/join`,
    LEAVE:     '/clans/leave',
    CHALLENGE: (id: string) => `/clans/${id}/challenge`,
    BATTLE:    (battleId: string) => `/clans/battles/${battleId}`,
  },

  // Classroom
  CLASSROOM: {
    CREATE:       '/classroom',
    BY_ID:        (id: string) => `/classroom/${id}`,
    JOIN:         (id: string) => `/classroom/${id}/join`,
    HEARTBEAT:    (id: string) => `/classroom/${id}/heartbeat`,
    QUIZ:         (id: string) => `/classroom/${id}/quiz`,
    POLL:         (id: string) => `/classroom/${id}/poll`,
    ASYNC_CREATE: (id: string) => `/classroom/${id}/async`,
    ASYNC_SUBMIT: (id: string) => `/classroom/${id}/async/submit`,
    RECORDING:    (id: string) => `/classroom/${id}/recording`,
    ATTENDANCE:   (id: string) => `/classroom/${id}/attendance`,
  },

  ATTENDANCE: {
    SCAN: '/attendance/scan',
    SAVE: '/attendance',
  },

  // Portfolio
  PORTFOLIO: {
    MY: '/portfolios/me',
    BY_LINK: (link: string) => `/portfolios/view/${link}`,
    VISIBILITY: '/portfolios/me/visibility',
    REGENERATE: '/portfolios/me/regenerate-link',
  },

  // Chat
  CHAT: {
    LIST: '/chat',
    START: (userId: string) => `/chat/user/${userId}`,
    MESSAGES: (id: string) => `/chat/${id}`,
    SEND: (id: string) => `/chat/${id}/messages`,
    READ: (id: string) => `/chat/${id}/read`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL: '/notifications/read-all',
  },

  // Weekly Mystery
  MYSTERY: {
    CURRENT: '/weekly-mystery/current',
    WINNERS: '/weekly-mystery/winners',
    STATS:   '/weekly-mystery/stats',
    ANSWER:  '/weekly-mystery/answer',
    FINAL:   '/weekly-mystery/final',
  },

  // Gamification
  GAMIFICATION: {
    ME: '/gamification/me',
    LEADERBOARD_GROUP: (id: string) => `/gamification/leaderboard/group/${id}`,
    LEADERBOARD_NATIONAL: '/gamification/leaderboard/national',
  },

  // Invites
  INVITES: {
    SEND: '/invites',
    MY: '/invites/my',
    SENT: '/invites/sent',
    RESPOND: (id: string) => `/invites/${id}/respond`,
  },

  // Elo
  ELO: {
    ME: '/elo/me',
    LEADERBOARD: (subject: string) => `/elo/leaderboard/${subject}`,
  },

  // Streak Freeze
  STREAK_FREEZE: {
    ME: '/streak-freeze/me',
    BUY: '/streak-freeze/buy',
    ACTIVATE: '/streak-freeze/activate',
  },

  // Accessibility
  ACCESSIBILITY: {
    ME: '/accessibility/me',
    UPDATE: '/accessibility/me',
  },

  // Groups
  GROUPS: {
    LIST:    '/groups',
    BY_ID:   (id: string) => `/groups/${id}`,
    CREATE:  '/groups',
    UPDATE:  (id: string) => `/groups/${id}`,
    DELETE:  (id: string) => `/groups/${id}`,
    INVITE:  (id: string) => `/groups/${id}/invite`,
    REMOVE:  (id: string, userId: string) => `/groups/${id}/members/${userId}`,
    ATTENDANCE: (id: string) => `/groups/${id}/attendance`,
  },

  // Teacher CRM
  TEACHER_ME: {
    STATS:     '/teachers/me/stats',
    STUDENTS:  '/teachers/me/students',
    ANALYTICS: '/teachers/me/analytics',
  },
} as const

export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARDING: '/onboarding',
  SETTINGS: '/settings',
  DASHBOARD: {
    ROOT: '/dashboard',
    STUDENT: '/dashboard/student',
    TEACHER: '/dashboard/teacher',
    PARENT: '/dashboard/parent',
  },
  DAILY: '/quiz/daily',
  COMPETITION: {
    ROOM:   (id: string) => `/competition/${id}`,
    LOBBY:  (id: string) => `/competition/${id}/lobby`,
    RESULT: (id: string) => `/competition/${id}/result`,
  },
  WEEKLY_MYSTERY: '/weekly-mystery',
  COURSES: '/courses',
  COURSE: (id: string) => `/courses/${id}`,
  CLAN: (slug: string) => `/clan/${slug}`,
  CLAN_BATTLE: (slug: string, battleId: string) => `/clan/${slug}/battle/${battleId}`,
  CLAN_LEADERBOARD: '/leaderboard/clans',
  TEACHER: (slug: string) => `/teachers/${slug}`,
  PORTFOLIO: (link: string) => `/portfolio/${link}`,
  PORTFOLIO_ME: '/portfolio/me',
  GROUPS: '/groups',
  ANALYTICS: '/analytics',
  CHAT: '/chat',
  CLASSROOM:    (id: string) => `/classroom/${id}`,
  CLASSROOM_QR: (id: string) => `/classroom/${id}/qr`,
  ADMIN: '/admin',
  NOT_FOUND: '*',
} as const

export const LEAGUE_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
} as const

export const AGE_GROUPS = [
  '3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+'
] as const

export const MAX_HEARTS = 5
export const DAILY_QUESTION_LIMIT = 5
export const FREEZE_COST_GEMS = 50
