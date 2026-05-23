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
    BY_ID: (id: string) => `/courses/${id}`,
    CREATE: '/courses',
    UPDATE: (id: string) => `/courses/${id}`,
    PUBLISH: (id: string) => `/courses/${id}/publish`,
    DELETE: (id: string) => `/courses/${id}`,
    ADD_LESSON: (id: string) => `/courses/${id}/lessons`,
    ENROLL: '/courses/enroll',
    COMPLETE_LESSON: (id: string) => `/courses/${id}/complete-lesson`,
    MY_ENROLLMENTS: '/courses/my/enrollments',
  },

  // Daily Questions
  DAILY: {
    GET: '/daily',
    ANSWER: '/daily/answer',
  },

  // Teachers
  TEACHERS: {
    FEATURED: '/teachers/featured',
    BY_SLUG: (slug: string) => `/teachers/${slug}`,
    COURSES: (slug: string) => `/teachers/${slug}/courses`,
    UPDATE_SHOWCASE: '/teachers/me/showcase',
  },

  // Clans
  CLANS: {
    LEADERBOARD: '/clans/leaderboard',
    BY_SLUG: (slug: string) => `/clans/${slug}`,
    CREATE: '/clans',
    JOIN: (id: string) => `/clans/${id}/join`,
    LEAVE: '/clans/leave',
    CHALLENGE: (id: string) => `/clans/${id}/challenge`,
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
    ROOM: (id: string) => `/competition/${id}`,
    LOBBY: (id: string) => `/competition/${id}/lobby`,
  },
  WEEKLY_MYSTERY: '/weekly-mystery',
  COURSES: '/courses',
  COURSE: (id: string) => `/courses/${id}`,
  CLAN: (slug: string) => `/clan/${slug}`,
  TEACHER: (slug: string) => `/teachers/${slug}`,
  PORTFOLIO: (link: string) => `/portfolio/${link}`,
  CHAT: '/chat',
  CLASSROOM: (id: string) => `/classroom/${id}`,
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
