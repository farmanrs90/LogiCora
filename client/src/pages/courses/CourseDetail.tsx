import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/axios'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  title: string
  duration: number // minutes
  videoUrl?: string
  isFree: boolean
  isCompleted: boolean
  order: number
}

interface Section {
  id: string
  title: string
  lessons: Lesson[]
}

interface Review {
  id: string
  user: { name: string; avatar?: string }
  rating: number
  comment: string
  createdAt: string
}

interface CourseDetailData {
  id: string
  title: string
  description: string
  longDescription: string
  thumbnail: string
  previewVideoUrl?: string
  price: number
  discountedPrice?: number
  isFree: boolean
  rating: number
  reviewCount: number
  studentCount: number
  duration: number // total minutes
  level: 'başlanğıc' | 'orta' | 'irəliləmiş'
  language: string
  updatedAt: string
  tags: string[]
  whatYoullLearn: string[]
  requirements: string[]
  sections: Section[]
  reviews: Review[]
  teacher: {
    id: string
    name: string
    slug: string
    avatar?: string
    isVerified: boolean
    totalStudents: number
    rating: number
    bio: string
    courseCount: number
  }
  isEnrolled: boolean
  enrollmentProgress: number // 0-100
  ownerUserId: string // kursun sahib müəlliminin User._id-si (sahiblik yoxlaması üçün)
  certificate?: { url: string; issuedAt: string }
}

type RawRecord = Record<string, unknown>

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(mins: number): string {
  const safeMins = Number.isFinite(mins) && mins > 0 ? Math.floor(mins) : 0
  const h = Math.floor(safeMins / 60)
  const m = safeMins % 60
  return h > 0 ? `${h} saat ${m > 0 ? m + ' dəq' : ''}` : `${m} dəq`
}

function fmtDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' })
}

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  const str = asString(value).trim()
  return str || undefined
}

function asNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(num) ? num : fallback
}

function asOptionalNumber(value: unknown): number | undefined {
  const num = asNumber(value, NaN)
  return Number.isFinite(num) ? num : undefined
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeLevel(value: unknown): CourseDetailData['level'] {
  const level = asString(value)
  if (level === 'intermediate' || level === 'orta') return 'orta'
  if (level === 'advanced' || level === 'irəliləmiş') return 'irəliləmiş'
  return 'başlanğıc'
}

function normalizeLesson(raw: unknown, index: number): Lesson | null {
  if (!isRecord(raw)) return null

  const id = asString(raw._id) || asString(raw.id)
  if (!id) return null

  return {
    id,
    title: asString(raw.title),
    duration: asNumber(raw.duration),
    videoUrl: asOptionalString(raw.videoUrl),
    isFree: asBoolean(raw.isFree),
    isCompleted: asBoolean(raw.isCompleted),
    order: asNumber(raw.order, index + 1),
  }
}

function normalizeLessons(raw: unknown): Lesson[] {
  return Array.isArray(raw)
    ? raw.map((lesson, index) => normalizeLesson(lesson, index)).filter((lesson): lesson is Lesson => Boolean(lesson))
    : []
}

function normalizeSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return []

  return raw.map((section, index) => {
    if (!isRecord(section)) return null

    const lessons = normalizeLessons(section.lessons)
    const title = asString(section.title) || 'Bölmə'

    return {
      id: asString(section._id) || asString(section.id) || `${index}`,
      title,
      lessons,
    }
  }).filter((section): section is Section => Boolean(section))
}

function normalizeReviews(raw: unknown): Review[] {
  if (!Array.isArray(raw)) return []

  return raw.reduce<Review[]>((acc, review, index) => {
    if (!isRecord(review)) return acc

    const user = isRecord(review.user) ? review.user : {}
    const avatar = asOptionalString(user.avatar)
    const normalized: Review = {
      id: asString(review._id) || asString(review.id) || `${index}`,
      user: {
        name: asString(user.name) || asString(review.userName) || 'İstifadəçi',
        ...(avatar ? { avatar } : {}),
      },
      rating: asNumber(review.rating),
      comment: asString(review.comment),
      createdAt: asString(review.createdAt),
    }

    acc.push(normalized)
    return acc
  }, [])
}

function normalizeTeacher(course: RawRecord): CourseDetailData['teacher'] {
  const rawTeacher = isRecord(course.teacher)
    ? course.teacher
    : isRecord(course.teacherId)
      ? course.teacherId
      : {}
  const user = isRecord(rawTeacher.userId) ? rawTeacher.userId : {}
  const teacherId = asString(rawTeacher._id) || asString(rawTeacher.id) || asString(course.teacherId)
  const userName = [asString(user.name), asString(user.surname)].filter(Boolean).join(' ').trim()
  const directName = [asString(rawTeacher.name), asString(rawTeacher.surname)].filter(Boolean).join(' ').trim()
  const name = asString(course.teacherName)
    || asString(rawTeacher.displayName)
    || directName
    || userName
    || 'Müəllim'

  return {
    id: teacherId,
    name,
    slug: asString(rawTeacher.slug) || teacherId,
    avatar: asOptionalString(rawTeacher.avatar),
    isVerified: asBoolean(rawTeacher.isVerified),
    totalStudents: asNumber(rawTeacher.totalStudents),
    rating: asNumber(rawTeacher.rating),
    bio: asString(rawTeacher.bio),
    courseCount: asNumber(rawTeacher.courseCount),
  }
}

function unwrapApiEnvelope(payload: unknown): unknown {
  if (!isRecord(payload)) return payload
  if ('data' in payload && ('success' in payload || 'message' in payload)) return payload.data ?? null
  return payload
}

function normalizeCourseDetailResponse(payload: unknown): CourseDetailData | null {
  const unwrapped = unwrapApiEnvelope(payload)
  if (!isRecord(unwrapped)) return null

  const source = isRecord(unwrapped.course) ? unwrapped.course : unwrapped
  const id = asString(source._id) || asString(source.id)
  if (!id) return null

  const price = Math.max(0, asNumber(source.price))
  const discountedPrice = asOptionalNumber(source.discountedPrice ?? source.discountPrice)
  const flatLessons = normalizeLessons(isRecord(unwrapped.course) ? unwrapped.lessons : source.lessons)
  const sections = normalizeSections(source.sections)
  const normalizedSections = sections.length > 0
    ? sections
    : flatLessons.length > 0
      ? [{ id: `${id}-lessons`, title: 'Dərslər', lessons: flatLessons }]
      : []
  let certificate: CourseDetailData['certificate']
  if (isRecord(source.certificate)) {
    const url = asString(source.certificate.url)
    if (url) {
      certificate = {
        url,
        issuedAt: asString(source.certificate.issuedAt),
      }
    }
  }

  return {
    id,
    title: asString(source.title),
    description: asString(source.description),
    longDescription: asString(source.longDescription) || asString(source.description),
    thumbnail: asString(source.thumbnail ?? source.thumbnailUrl),
    previewVideoUrl: asOptionalString(source.previewVideoUrl ?? source.previewVideo),
    price,
    discountedPrice,
    isFree: asBoolean(source.isFree, price === 0),
    rating: asNumber(source.rating),
    reviewCount: asNumber(source.reviewCount ?? source.ratingCount),
    studentCount: asNumber(source.studentCount ?? source.totalEnrolled),
    duration: asNumber(source.duration ?? source.totalDuration),
    level: normalizeLevel(source.level),
    language: asString(source.language, 'az'),
    updatedAt: asString(source.updatedAt ?? source.createdAt),
    tags: asStringArray(source.tags),
    whatYoullLearn: asStringArray(source.whatYoullLearn ?? source.whatYouLearn),
    requirements: asStringArray(source.requirements),
    sections: normalizedSections,
    reviews: normalizeReviews(source.reviews),
    teacher: normalizeTeacher(source),
    isEnrolled: asBoolean(source.isEnrolled),
    enrollmentProgress: Math.min(100, Math.max(0, asNumber(source.enrollmentProgress))),
    ownerUserId: isRecord(source.teacherId) ? asString((source.teacherId as RawRecord).userId) : '',
    certificate,
  }
}

function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= Math.round(value) ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1.5">
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

// ── Accordion Section ─────────────────────────────────────────────────────────

function SectionAccordion({
  section,
  isEnrolled,
  onComplete,
  focusLessonId,
}: {
  section: Section
  isEnrolled: boolean
  onComplete: (lessonId: string) => void
  focusLessonId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const total = section.lessons.reduce((s, l) => s + l.duration, 0)
  const completed = section.lessons.filter(l => l.isCompleted).length
  const hasFocusedLesson = Boolean(focusLessonId && section.lessons.some(lesson => lesson.id === focusLessonId))

  useEffect(() => {
    if (hasFocusedLesson) setOpen(true)
  }, [hasFocusedLesson])

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">{section.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {section.lessons.length} dərs · {fmtDuration(total)}
            {isEnrolled && completed > 0 && (
              <span className="text-emerald-600 ml-2">· {completed}/{section.lessons.length} tamamlandı</span>
            )}
          </p>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {section.lessons.map(lesson => (
              <div
                key={lesson.id}
                id={`course-lesson-${lesson.id}`}
                className={`flex items-center gap-3 px-4 py-3 border-t border-gray-100 hover:bg-slate-50 ${
                  lesson.id === focusLessonId ? 'bg-indigo-50' : ''
                }`}
              >
                {/* Status icon */}
                {lesson.isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${isEnrolled || lesson.isFree ? 'border-gray-300' : 'border-gray-200'}`}>
                    {(!isEnrolled && !lesson.isFree) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                        <path d="M18 11H6V8a6 6 0 0112 0v3zm-1 9H7a2 2 0 01-2-2v-6h14v6a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${lesson.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {lesson.title}
                  </p>
                  <p className="text-xs text-gray-400">{fmtDuration(lesson.duration)}</p>
                </div>
                {lesson.isFree && (
                  <span className="text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                    Pulsuz
                  </span>
                )}
                {isEnrolled && !lesson.isCompleted && (
                  <button
                    onClick={() => onComplete(lesson.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
                  >
                    Tamamla
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Enrollment Card ────────────────────────────────────────────────────────────

function EnrollmentCard({
  course,
  onEnroll,
  isEnrolling,
  onContinue,
  onCertificate,
  isOwner,
  onEdit,
}: {
  course: CourseDetailData
  onEnroll: () => void
  isEnrolling: boolean
  onContinue: () => void
  onCertificate: () => void
  isOwner: boolean
  onEdit: () => void
}) {
  const displayPrice = course.discountedPrice ?? course.price
  const hasDiscount = course.price > 0 && course.discountedPrice !== undefined && course.discountedPrice < course.price

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Thumbnail preview */}
      <div className="relative aspect-video bg-slate-900">
        {course.thumbnail && (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        )}
        {course.previewVideoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Price */}
        <div className="flex items-end gap-3">
          {course.isFree ? (
            <span className="text-3xl font-bold text-emerald-600">Pulsuz</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-gray-900">{displayPrice} ₼</span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through mb-0.5">{course.price} ₼</span>
              )}
              {hasDiscount && (
                <span className="text-sm text-rose-500 font-semibold mb-0.5">
                  {Math.round(((course.price - displayPrice) / course.price) * 100)}% endirim
                </span>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        {isOwner ? (
          <button
            onClick={onEdit}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            ✏️ Kursu redaktə et
          </button>
        ) : course.isEnrolled ? (
          <div className="space-y-2">
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tərəqqi</span>
                <span>{course.enrollmentProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${course.enrollmentProgress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Dəvam et →
            </button>
            {course.enrollmentProgress === 100 && (
              <button
                onClick={onCertificate}
                className="w-full py-2.5 rounded-xl border border-amber-300 text-amber-600 font-semibold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15l-2 5-1-1-5 1 1-5-1-1 5-2 3 3zM18 8a5 5 0 00-8-4 4 4 0 105 5 5 5 0 003-1z" />
                </svg>
                Sertifikat al
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onEnroll}
              disabled={isEnrolling}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {isEnrolling ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {course.isFree ? 'Pulsuz qoşul' : 'Ödəniş/təsdiq tələb et'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            {!course.isFree && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
                Pullu kurs — qoşulduqda dərhal açılmır. Ödəniş/təsdiq tələb olunur və valideynə bildiriş gedir. Real ödəniş sistemi post-demo mərhələsində aktivləşəcək.
              </p>
            )}
          </div>
        )}

        {/* Trust signals — yalnız dürüst platforma faktları (saxta zəmanət/ödəniş iddiası yox) */}
        <div className="pt-2 space-y-2 text-sm text-gray-500">
          {[
            { icon: '📱', text: 'Mobil + masaüstü dəstək' },
            { icon: '📊', text: 'İrəliləyiş izləməsi' },
            { icon: '🎓', text: 'Tamamlama sertifikatı (post-demo)' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TABS = ['Kurs haqqında', 'Dərslər', 'Rəylər', 'Müəllim'] as const
type Tab = typeof TABS[number]

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Kurs haqqında')
  const [showAllLearn, setShowAllLearn] = useState(false)
  const [showAllSections, setShowAllSections] = useState(false)
  const [focusedLessonId, setFocusedLessonId] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isCardSticky, setIsCardSticky] = useState(false)

  // ── Sticky card scroll logic ───────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setIsCardSticky(rect.top <= 24)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: course, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', id],
    queryFn: () =>
      api.get<unknown>(API_ROUTES.COURSES.BY_ID(id!))
        .then(r => normalizeCourseDetailResponse(r.data)),
    enabled: !!id,
  })

  const openLessonsFlow = (targetCourse: CourseDetailData) => {
    const allLessons = targetCourse.sections.flatMap(section => section.lessons)
    const nextLesson = allLessons.find(lesson => !lesson.isCompleted) ?? allLessons[0]

    if (!nextLesson) {
      setFocusedLessonId(null)
      setActiveTab('Dərslər')
      toast.error('Bu kurs üçün dərslər hələ əlavə edilməyib.')
      requestAnimationFrame(() => {
        tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }

    setFocusedLessonId(nextLesson.id)
    setShowAllSections(true)
    setActiveTab('Dərslər')
    requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        document.getElementById(`course-lesson-${nextLesson.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 180)
    })
  }

  const enrollMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.COURSES.ENROLL, { courseId: id }).then(r => r.data),
    onSuccess: (resp: unknown) => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      // Pullu kurs → backend pending_payment qaytarır: giriş AÇILMIR (fake unlock yox).
      const status = isRecord(resp) && isRecord(resp.data) ? resp.data.status : undefined
      if (status === 'pending_payment') {
        toast('Qoşulma sorğun göndərildi. Ödəniş/təsdiq gözlənilir — valideynə bildiriş göndərildi.', { icon: '⏳' })
        return
      }
      // Pulsuz kurs → real aktiv qeydiyyat, dərslərə keç.
      if (course) openLessonsFlow(course)
    },
    onError: () => {
      // Backend xətası: lokal "uğur" göstərmirik — real vəziyyət dəyişməz qalır.
      toast.error('Kursa qeydiyyat alınmadı. Zəhmət olmasa yenidən cəhd edin.')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (lessonId: string) =>
      api.post(API_ROUTES.COURSES.COMPLETE_LESSON(id!), { lessonId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', id] }),
    onError: () => {
      // Backend xətası: dərs tamamlanmış kimi göstərmirik — lokal state dəyişməz qalır.
      toast.error('Dərs tamamlanmadı. Bağlantını yoxlayıb yenidən cəhd edin.')
    },
  })

  const handleContinue = () => {
    if (!course) return
    openLessonsFlow(course)
  }

  const handleCertificate = () => {
    toast.error('Sertifikat funksiyası demo üçün deaktivdir. Rəsmi sertifikat doğrulaması post-demo mərhələsində əlavə ediləcək.')
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 animate-pulse">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
            <div className="h-4 bg-slate-200 rounded-xl w-full" />
            <div className="h-4 bg-slate-200 rounded-xl w-5/6" />
            <div className="h-64 bg-slate-200 rounded-2xl" />
          </div>
          <div className="h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ── Error / not-found state ──────────────────────────────────────────────────
  // Backend 404 və ya xəta verdikdə fake kurs göstərmirik — istifadəçiyə real vəziyyəti bildiririk.
  if (isError || !course) {
    return (
      <div className="min-h-screen bg-slate-50 text-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📕</div>
          <h1 className="text-2xl font-bold mb-2">Kurs tapılmadı və ya yüklənmədi</h1>
          <p className="text-gray-500 text-sm mb-6">
            Axtardığınız kurs mövcud deyil və ya hazırda yüklənə bilmədi.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to={APP_ROUTES.COURSES}
              className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              ← Kurslara qayıt
            </Link>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold transition-all"
            >
              Yenidən yoxla
            </button>
          </div>
        </div>
      </div>
    )
  }

  const visibleLearn = showAllLearn ? course.whatYoullLearn : course.whatYoullLearn.slice(0, 6)
  const totalLessons = course.sections.reduce((s, sec) => s + sec.lessons.length, 0)
  const displayedSections = showAllSections ? course.sections : course.sections.slice(0, 3)

  // Sahiblik: yalnız kursun sahib müəllimi idarəetmə (Redaktə) görür.
  const isOwner = !!user && user.role === 'teacher' && !!course.ownerUserId && user._id === course.ownerUserId
  const handleEdit = () => navigate(`/courses/${course.id}/edit`)

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Hero gradient header */}
      <div className="bg-gradient-to-b from-indigo-50 to-slate-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: course info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Link to={APP_ROUTES.COURSES} className="hover:text-gray-700 transition-colors">Kurslar</Link>
                <span>/</span>
                <span className="text-gray-600 truncate">{course.title}</span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold leading-tight text-gray-900">{course.title}</h1>
              <p className="text-gray-600 text-lg">{course.description}</p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <StarRating value={course.rating} size={14} />
                  <span className="text-amber-600 font-semibold">{course.rating}</span>
                  <span className="text-gray-400">({course.reviewCount} rəy)</span>
                </div>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600">{course.studentCount.toLocaleString()} tələbə</span>
                <span className="text-gray-300">·</span>
                <span className="capitalize text-gray-600">{course.level}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-600">{course.language} dilində</span>
              </div>

              {/* Teacher */}
              <Link
                to={`/teachers/${course.teacher.slug}`}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors w-fit"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {course.teacher.name[0]}
                </div>
                {course.teacher.name}
                {course.teacher.isVerified && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">✓ Təsdiqlənmiş</span>
                )}
              </Link>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {course.tags.map(tag => (
                  <span key={tag} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            {/* Right: enrollment card — visible on desktop in hero, hidden on mobile (appears below) */}
            <div ref={cardRef} className="hidden lg:block">
              <div className={isCardSticky ? 'lg:sticky lg:top-6' : ''}>
                <EnrollmentCard
                  course={course}
                  onEnroll={() => enrollMutation.mutate()}
                  isEnrolling={enrollMutation.isPending}
                  onContinue={handleContinue}
                  onCertificate={handleCertificate}
                  isOwner={isOwner}
                  onEdit={handleEdit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: tabs + content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Mobile: enrollment card */}
            <div className="lg:hidden">
              <EnrollmentCard
                course={course}
                onEnroll={() => enrollMutation.mutate()}
                isEnrolling={enrollMutation.isPending}
                onContinue={handleContinue}
                onCertificate={handleCertificate}
                isOwner={isOwner}
                onEdit={handleEdit}
              />
            </div>

            {/* Tabs */}
            <div ref={tabsRef} className="relative border-b border-gray-200">
              <div className="flex gap-0 overflow-x-auto scrollbar-none">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="course-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── TAB 1: Kurs haqqında ─────────────────────────────── */}
                {activeTab === 'Kurs haqqında' && (
                  <div className="space-y-8">
                    {/* What you'll learn */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
                      <h2 className="text-lg font-bold">Bu kursda nə öyrənəcəksiniz?</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {visibleLearn.map(item => (
                          <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" className="mt-0.5 shrink-0">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {item}
                          </div>
                        ))}
                      </div>
                      {course.whatYoullLearn.length > 6 && (
                        <button
                          onClick={() => setShowAllLearn(o => !o)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          {showAllLearn ? 'Daha az göstər ↑' : `+${course.whatYoullLearn.length - 6} daha göstər ↓`}
                        </button>
                      )}
                    </div>

                    {/* Requirements */}
                    <div className="space-y-3">
                      <h2 className="text-lg font-bold">Tələblər</h2>
                      <ul className="space-y-2">
                        {course.requirements.map(req => (
                          <li key={req} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <h2 className="text-lg font-bold">Kurs haqqında</h2>
                      <p className="text-gray-600 leading-relaxed text-sm">{course.longDescription}</p>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Ümumi müddət', value: fmtDuration(course.duration) },
                        { label: 'Dərslər', value: `${totalLessons} dərs` },
                        { label: 'Yeniləndi', value: fmtDate(course.updatedAt) },
                        { label: 'Səviyyə', value: course.level },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className="text-sm font-semibold capitalize text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Dərslər ──────────────────────────────────── */}
                {activeTab === 'Dərslər' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-600 text-sm">
                        {course.sections.length} bölmə · {totalLessons} dərs · {fmtDuration(course.duration)}
                      </p>
                      {!course.isEnrolled && (
                        <span className="text-xs text-gray-400">Pulsuz dərslər açıqdır</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {totalLessons > 0 ? (
                        displayedSections.map(section => (
                          <SectionAccordion
                            key={section.id}
                            section={section}
                            isEnrolled={course.isEnrolled}
                            onComplete={(lessonId) => completeMutation.mutate(lessonId)}
                            focusLessonId={focusedLessonId}
                          />
                        ))
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
                          Bu kurs üçün dərslər hələ əlavə edilməyib.
                        </div>
                      )}
                    </div>
                    {course.sections.length > 3 && (
                      <button
                        onClick={() => setShowAllSections(o => !o)}
                        className="w-full py-3 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
                      >
                        {showAllSections
                          ? 'Daha az göstər'
                          : `Bütün ${course.sections.length} bölməni göstər`}
                      </button>
                    )}
                  </div>
                )}

                {/* ── TAB 3: Rəylər ───────────────────────────────────── */}
                {/* Yalnız REAL rəy datası göstərilir — uydurma paylanma/statistika yoxdur. */}
                {activeTab === 'Rəylər' && (
                  <div className="space-y-6">
                    {/* Rating summary — real ortalama + say */}
                    <div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="text-center">
                        <p className="text-5xl font-bold text-amber-500">{course.rating}</p>
                        <StarRating value={course.rating} size={20} />
                        <p className="text-xs text-gray-400 mt-1">{course.reviewCount} rəy</p>
                      </div>
                      <div className="w-px h-16 bg-gray-200" />
                      <div className="flex-1 text-sm text-gray-600 leading-relaxed">
                        {course.reviewCount > 0
                          ? `${course.reviewCount} rəy əsasında ortalama reytinq.`
                          : 'Bu kurs üçün hələ rəy yoxdur.'}
                      </div>
                    </div>

                    {/* Review list — real rəylər */}
                    {course.reviews.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                        <p className="text-sm font-semibold text-gray-900">Bu kurs üçün hələ rəy yoxdur.</p>
                        <p className="mt-1 text-sm text-gray-500">Rəy bölməsi real istifadəçi rəyləri ilə formalaşacaq.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {course.reviews.map(review => (
                          <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                                  {review.user.name[0]}
                                </div>
                                <span className="font-medium text-sm text-gray-900">{review.user.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StarRating value={review.rating} size={12} />
                                <span className="text-xs text-gray-400">{fmtDate(review.createdAt)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 4: Müəllim ──────────────────────────────────── */}
                {activeTab === 'Müəllim' && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shrink-0">
                        {course.teacher.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold">{course.teacher.name}</h2>
                          {course.teacher.isVerified && (
                            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">✓ Təsdiqlənmiş</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          <span>⭐ {course.teacher.rating} reytinq</span>
                          <span>👥 {course.teacher.totalStudents.toLocaleString()} tələbə</span>
                          <span>📚 {course.teacher.courseCount} kurs</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{course.teacher.bio}</p>
                    <Link
                      to={`/teachers/${course.teacher.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-sm transition-colors"
                    >
                      Tam profili gör
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: sticky card (desktop, below hero) */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <EnrollmentCard
                course={course}
                onEnroll={() => enrollMutation.mutate()}
                isEnrolling={enrollMutation.isPending}
                onContinue={handleContinue}
                onCertificate={handleCertificate}
                isOwner={isOwner}
                onEdit={handleEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
