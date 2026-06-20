import type { CharacterType } from '../lib/companion'

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
  termsAccepted: boolean
  termsVersion?: string
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
  characterType?: CharacterType | null   // ← onboarding-dən gəlir, avatarColor mənbəyi
  profileCompleted?: boolean             // ← onboarding bitibmi? 
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

// Quiz
export type QuestionFormat = 'A' | 'B' | 'C' | 'D' | 'E'

export interface QuestionOption {
  id: string
  text: string
  emoji?: string
}

export interface QuestionHotspot {
  id: string
  x: number  // % of container width
  y: number  // % of container height
  label: string
  isCorrect: boolean
}

export interface Question {
  _id: string
  text: string
  emoji?: string
  imageUrl?: string
  format: QuestionFormat
  options: QuestionOption[]
  correctAnswer: string
  subject: string
  ageGroups: AgeGroup[]
  xpReward: number
  timeLimit: number
  // Format D
  blankSentence?: string
  wordChoices?: string[]
  // Format E
  hotspots?: QuestionHotspot[]
}

export interface AnswerResponse {
  correct: boolean
  xpEarned: number
  newStreak: number
  heartsLeft: number
  correctAnswer: string
  badge?: { name: string; emoji: string }
}

// Competition
export interface Participant {
  userId: string
  name: string
  avatarColor: string
  score: number
  rank: number
  correctCount: number
  wrongCount: number
  avgResponseTime: number
  hasAnswered?: boolean
}

export interface CompetitionInfo {
  _id: string
  title: string
  subject: string
  pin: string
  status: 'waiting' | 'active' | 'finished'
  organizerId: string
  participants: Participant[]
  questionCount: number
  isWeeklyMystery: boolean
  startedAt?: string
  finishedAt?: string
}

export interface CompetitionResults {
  competitionId: string
  title: string
  subject: string
  participants: Participant[]
  myResult: {
    rank: number
    score: number
    xpEarned: number
    correctCount: number
    wrongCount: number
    avgResponseTime: number
    badge?: { name: string; emoji: string }
  }
  isClanBattle: boolean
  isHost?: boolean
  clanResults?: { clanName: string; score: number; isWinner: boolean }[]
}

export interface DailyStatusResponse {
  completed: boolean
  answeredCount: number
  totalCount: number
  streak: number
  xpEarned: number
}

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing'
export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced'

export interface StudentLearningProfile {
  _id: string
  grade: number
  school?: string
  subjects: string[]
  interests: string[]
  learningStyle: LearningStyle
  knowledgeLevel: KnowledgeLevel
}

// Weekly Mystery
export interface WeeklyMysteryQuestion {
  _id: string
  text: string
  difficulty: 'hard' | 'legendary'
  weekNumber: number
  revealedAt: string
  attemptCount: number
  isSolved: boolean
  winner?: WeeklyWinner
  answer?: string
}

export interface WeeklyWinner {
  userId: string
  name: string
  city: string
  avatarColor: string
  solvedInMinutes: number
  solvedAt: string
  weekNumber: number
}

export interface WeeklyStats {
  attemptCount: number
  solvedCount: number
  fastestMinutes: number
  fastestSeconds: number
}

export interface MysteryCurrentResponse {
  status: 'waiting' | 'active' | 'solved'
  nextRevealAt?: string
  question?: WeeklyMysteryQuestion
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

// Chat
export interface ChatParticipant {
  _id: string
  name: string
  surname: string
  role: Role
}

export interface ChatMessage {
  _id: string
  senderId: string        // ObjectId — current user._id ilə müqayisə olunur
  content: string
  sentAt: string
  readAt: string | null
}

export interface Conversation {
  _id: string
  participants: ChatParticipant[]
  lastMessage: string | null
  lastMessageAt: string | null
}

// GET /chat/:id — mesajlar daxil tam söhbət
export interface ConversationDetail extends Conversation {
  messages: ChatMessage[]
}


// ── Kids Hub ────────────────────────────────────────────────────────────────

// Backend bunu hardcoded qaytarır: GET /kids/videos/categories
export interface KidsCategory {
  key: string   // 'vegetables', 'fruits' ... — filtrdə istifadə olunur
  emoji: string
  az: string   // ekranda göstərilən ad
}

export interface KidsQuestion {
  q: string
  options: string[]
  correct: number   // doğru variantın İNDEKSİ (label deyil!)
}

export interface KidsVideo {
  _id: string
  title: string
  titleAz: string
  videoUrl: string
  thumbnail: string
  duration: number          // saniyə
  category: string
  ageGroup: AgeGroup[]
  presenter: 'logi' | 'cora' | 'both'
  vocabulary: string[]
  questions: KidsQuestion[]
  views: number
  likes: number
}

// GET /kids/progress/me — populate olunmuş videoId ilə gəlir
export interface KidsProgressItem {
  _id: string
  videoId: {
    _id: string
    title: string
    titleAz: string
    thumbnail: string
    category: string
    duration: number
  } | null                    // video silinibsə null ola bilər
  watched: boolean
  xpEarned: number
  questionsCorrect: number
  correctQuestions: number[]   // artıq doğru cavablanmış sual indeksləri
  completedAt: string | null
}

// POST /kids/videos/:id/answer cavabı
export interface KidsAnswerResult {
  correct: boolean
  xpEarned: number
  correctAnswer: number   // doğru variantın indeksi
}
