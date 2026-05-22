// Auth
export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  surname: string
  email: string
  phone: string
  password: string
  role: 'student' | 'teacher' | 'parent'
  ageGroup: AgeGroup
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

// User
export type Role = 'student' | 'teacher' | 'parent' | 'admin' | 'manager'
export type AgeGroup = '3-5' | '6-8' | '9-11' | '12-14' | '15-17' | '18-22' | '23+'
export type Language = 'az' | 'ru' | 'en'

export interface User {
  _id: string
  name: string
  surname: string
  email: string
  phone: string
  role: Role
  ageGroup: AgeGroup
  language: Language
  isSpecialNeeds: boolean
  specialNeedsType?: string
  isPhoneVerified: boolean
  createdAt: string
}

// Gamification
export interface GamificationProfile {
  _id: string
  studentId: string
  totalXP: number
  level: number
  streak: number
  lastActivityDate: string | null
  weeklyXP: number
  leagueTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  badges: string[]
  hearts: number
  gems: number
}

// Course
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Course {
  _id: string
  title: string
  description: string
  teacherId: string
  price: number
  discountPrice: number | null
  category: string
  level: CourseLevel
  thumbnail: string | null
  totalDuration: number
  language: Language
  ageGroup: AgeGroup[]
  tags: string[]
  isPublished: boolean
  isFeatured: boolean
  totalEnrolled: number
  rating: number
  ratingCount: number
  certificate: boolean
  createdAt: string
}

export interface Enrollment {
  _id: string
  studentId: string
  courseId: Course
  progress: number
  completedLessons: string[]
  completedAt: string | null
  certificateUrl: string | null
  enrolledAt: string
}

// Clan
export interface Clan {
  _id: string
  name: string
  slug: string
  schoolName: string
  emblem: string | null
  totalXP: number
  weeklyXP: number
  wins: number
  losses: number
  members: ClanMember[]
}

export interface ClanMember {
  studentId: string
  role: 'leader' | 'member'
  joinedAt: string
}

// Notification
export interface Notification {
  _id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// API
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface ApiError {
  message: string
  status: number
}
