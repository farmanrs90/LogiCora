import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/axios'
import { API_ROUTES, APP_ROUTES } from '../../constants'

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
  certificate?: { url: string; issuedAt: string }
}

// ── Mock ──────────────────────────────────────────────────────────────────────

const MOCK_COURSE: CourseDetailData = {
  id: '1',
  title: 'Python ilə Tam Proqramlaşdırma Kursu',
  description: 'Sıfırdan pro səviyyəyə Python öyrənin. Real layihələr, canlı tapşırıqlar.',
  longDescription: 'Bu kurs sizə Python proqramlaşdırma dilinin əsaslarından başlayaraq irəliləmiş mövzulara qədər tam bilik verəcəkdir. Kurs boyunca 50-dən çox real layihə üzərində işləyəcəksiniz. Hər dərs video + interaktiv quiz ilə tamamlanır.',
  thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
  previewVideoUrl: undefined,
  price: 120,
  discountedPrice: 79,
  isFree: false,
  rating: 4.8,
  reviewCount: 342,
  studentCount: 2840,
  duration: 2400,
  level: 'başlanğıc',
  language: 'Azərbaycan',
  updatedAt: '2026-04-15',
  tags: ['Python', 'Proqramlaşdırma', 'Data Science', 'Backend'],
  whatYoullLearn: [
    'Python sintaksisini tam mənimsəmək',
    'OOP (Obyekt-yönümlü proqramlaşdırma)',
    'Fayl əməliyyatları və API inteqrasiyası',
    'Flask ilə web tətbiqləri qurmaq',
    'Data analizi üçün Pandas / NumPy',
    'Real dünya layihələri hazırlamaq',
  ],
  requirements: [
    'Kompüter (Windows / Mac / Linux)',
    'İnternet bağlantısı',
    'Proqramlaşdırma biliyinə ehtiyac yoxdur',
  ],
  sections: [
    {
      id: 's1', title: 'Giriş və Quraşdırma', lessons: [
        { id: 'l1', title: 'Kursa xoş gəldiniz', duration: 5, isFree: true, isCompleted: true, order: 1 },
        { id: 'l2', title: 'Python-u quraşdırın', duration: 8, isFree: true, isCompleted: true, order: 2 },
        { id: 'l3', title: 'İlk proqramınız: Hello World', duration: 12, isFree: false, isCompleted: false, order: 3 },
      ]
    },
    {
      id: 's2', title: 'Dəyişənlər və Tipləri', lessons: [
        { id: 'l4', title: 'Dəyişənlər nədir?', duration: 15, isFree: false, isCompleted: false, order: 4 },
        { id: 'l5', title: 'String, int, float, bool', duration: 18, isFree: false, isCompleted: false, order: 5 },
        { id: 'l6', title: 'Tip çevirmə (type casting)', duration: 10, isFree: false, isCompleted: false, order: 6 },
      ]
    },
    {
      id: 's3', title: 'Şərt operatorları və Dövrlər', lessons: [
        { id: 'l7', title: 'if / elif / else', duration: 20, isFree: false, isCompleted: false, order: 7 },
        { id: 'l8', title: 'for dövrü', duration: 22, isFree: false, isCompleted: false, order: 8 },
        { id: 'l9', title: 'while dövrü', duration: 18, isFree: false, isCompleted: false, order: 9 },
      ]
    },
  ],
  reviews: [
    { id: 'r1', user: { name: 'Aynur M.', avatar: undefined }, rating: 5, comment: 'Möhtəşəm kurs! Hər şey çox aydın izah olunur.', createdAt: '2026-03-10' },
    { id: 'r2', user: { name: 'Tural Q.', avatar: undefined }, rating: 5, comment: 'Python-u bu kursdan öyrəndim. İndi işləyirəm!', createdAt: '2026-02-28' },
    { id: 'r3', user: { name: 'Leyla H.', avatar: undefined }, rating: 4, comment: 'Çox yaxşı kurs. Bəzi dərslər daha ətraflı ola bilərdi.', createdAt: '2026-02-15' },
  ],
  teacher: {
    id: 't1',
    name: 'Rəşad Əliyev',
    slug: 'rashad-aliyev',
    avatar: undefined,
    isVerified: true,
    totalStudents: 12400,
    rating: 4.9,
    bio: '10 il təcrübəli proqramçı. Google, Microsoft sertifikatları var. 5000+ tələbəyə Python öyrədib.',
    courseCount: 8,
  },
  isEnrolled: false,
  enrollmentProgress: 0,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h} saat ${m > 0 ? m + ' dəq' : ''}` : `${m} dəq`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' })
}

function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= Math.round(value) ? '#FACC15' : 'none'} stroke="#FACC15" strokeWidth="1.5">
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-white/60 w-4">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-yellow-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <span className="text-white/50 w-8 text-right">{count}</span>
    </div>
  )
}

// ── Accordion Section ─────────────────────────────────────────────────────────

function SectionAccordion({
  section,
  isEnrolled,
  onComplete,
}: {
  section: Section
  isEnrolled: boolean
  onComplete: (lessonId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const total = section.lessons.reduce((s, l) => s + l.duration, 0)
  const completed = section.lessons.filter(l => l.isCompleted).length

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-colors text-left"
      >
        <div>
          <p className="font-semibold text-white">{section.title}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {section.lessons.length} dərs · {fmtDuration(total)}
            {isEnrolled && completed > 0 && (
              <span className="text-emerald-400 ml-2">· {completed}/{section.lessons.length} tamamlandı</span>
            )}
          </p>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" className="text-white/40 shrink-0"
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
                className="flex items-center gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/3"
              >
                {/* Status icon */}
                {lesson.isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${isEnrolled || lesson.isFree ? 'border-white/30' : 'border-white/15'}`}>
                    {(!isEnrolled && !lesson.isFree) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-white/30">
                        <path d="M18 11H6V8a6 6 0 0112 0v3zm-1 9H7a2 2 0 01-2-2v-6h14v6a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${lesson.isCompleted ? 'text-white/60 line-through' : 'text-white/90'}`}>
                    {lesson.title}
                  </p>
                  <p className="text-xs text-white/40">{fmtDuration(lesson.duration)}</p>
                </div>
                {lesson.isFree && (
                  <span className="text-xs text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded shrink-0">
                    Pulsuz
                  </span>
                )}
                {isEnrolled && !lesson.isCompleted && (
                  <button
                    onClick={() => onComplete(lesson.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0"
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
  onCertificate,
}: {
  course: CourseDetailData
  onEnroll: () => void
  isEnrolling: boolean
  onCertificate: () => void
}) {
  const displayPrice = course.discountedPrice ?? course.price
  const hasDiscount = course.discountedPrice !== undefined && course.discountedPrice < course.price

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Thumbnail preview */}
      <div className="relative aspect-video bg-black">
        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80" />
        {course.previewVideoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
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
            <span className="text-3xl font-bold text-emerald-400">Pulsuz</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-white">{displayPrice} ₼</span>
              {hasDiscount && (
                <span className="text-lg text-white/40 line-through mb-0.5">{course.price} ₼</span>
              )}
              {hasDiscount && (
                <span className="text-sm text-rose-400 font-semibold mb-0.5">
                  {Math.round(((course.price - displayPrice) / course.price) * 100)}% endirim
                </span>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        {course.isEnrolled ? (
          <div className="space-y-2">
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/50">
                <span>Tərəqqi</span>
                <span>{course.enrollmentProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${course.enrollmentProgress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
            <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors">
              Dəvam et →
            </button>
            {course.enrollmentProgress === 100 && (
              <button
                onClick={onCertificate}
                className="w-full py-2.5 rounded-xl border border-yellow-400/30 text-yellow-400 font-semibold hover:bg-yellow-400/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15l-2 5-1-1-5 1 1-5-1-1 5-2 3 3zM18 8a5 5 0 00-8-4 4 4 0 105 5 5 5 0 003-1z" />
                </svg>
                Sertifikat al
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onEnroll}
            disabled={isEnrolling}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEnrolling ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {course.isFree ? 'İndi başla' : 'İndi qoşul'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Trust signals */}
        <div className="pt-2 space-y-2 text-sm text-white/50">
          {[
            { icon: '🔒', text: '30 günlük geri qaytarma zəmanəti' },
            { icon: '♾️', text: 'Ömürlük giriş' },
            { icon: '📱', text: 'Mobil + masaüstü' },
            { icon: '🏆', text: 'Tamamlama sertifikatı' },
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
  const [activeTab, setActiveTab] = useState<Tab>('Kurs haqqında')
  const [showAllLearn, setShowAllLearn] = useState(false)
  const [showAllSections, setShowAllSections] = useState(false)
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
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () =>
      api.get<CourseDetailData>(API_ROUTES.COURSES.BY_ID(id!))
        .then(r => r.data)
        .catch(() => MOCK_COURSE),
    enabled: !!id,
  })

  const enrollMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.COURSES.ENROLL, { courseId: id }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', id] }),
    onError: () => {
      // Mock success for demo
      qc.setQueryData(['course', id], (old: CourseDetailData | undefined) =>
        old ? { ...old, isEnrolled: true, enrollmentProgress: 5 } : old
      )
    },
  })

  const completeMutation = useMutation({
    mutationFn: (lessonId: string) =>
      api.post(API_ROUTES.COURSES.COMPLETE_LESSON(id!), { lessonId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', id] }),
    onError: (_err, lessonId) => {
      // Mock: mark lesson completed locally
      qc.setQueryData(['course', id], (old: CourseDetailData | undefined) => {
        if (!old) return old
        return {
          ...old,
          sections: old.sections.map(s => ({
            ...s,
            lessons: s.lessons.map(l => l.id === lessonId ? { ...l, isCompleted: true } : l),
          })),
        }
      })
    },
  })

  const handleCertificate = async () => {
    if (!id) return
    try {
      const res = await api.get(API_ROUTES.COURSES.CERTIFICATE(id))
      window.open(res.data.url, '_blank')
    } catch {
      alert('Sertifikat hazırlanır...')
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] animate-pulse">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-white/10 rounded-xl w-3/4" />
            <div className="h-4 bg-white/10 rounded-xl w-full" />
            <div className="h-4 bg-white/10 rounded-xl w-5/6" />
            <div className="h-64 bg-white/10 rounded-2xl" />
          </div>
          <div className="h-96 bg-white/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!course) return null

  const visibleLearn = showAllLearn ? course.whatYoullLearn : course.whatYoullLearn.slice(0, 6)
  const totalLessons = course.sections.reduce((s, sec) => s + sec.lessons.length, 0)
  const displayedSections = showAllSections ? course.sections : course.sections.slice(0, 3)

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Hero gradient header */}
      <div className="bg-gradient-to-b from-indigo-950/60 to-[#0D0D0D] border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: course info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Link to={APP_ROUTES.COURSES} className="hover:text-white transition-colors">Kurslar</Link>
                <span>/</span>
                <span className="text-white/70 truncate">{course.title}</span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{course.title}</h1>
              <p className="text-white/70 text-lg">{course.description}</p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <StarRating value={course.rating} size={14} />
                  <span className="text-yellow-400 font-semibold">{course.rating}</span>
                  <span className="text-white/40">({course.reviewCount} rəy)</span>
                </div>
                <span className="text-white/30">·</span>
                <span className="text-white/60">{course.studentCount.toLocaleString()} tələbə</span>
                <span className="text-white/30">·</span>
                <span className="capitalize text-white/60">{course.level}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/60">{course.language} dilində</span>
              </div>

              {/* Teacher */}
              <Link
                to={`/teachers/${course.teacher.slug}`}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors w-fit"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                  {course.teacher.name[0]}
                </div>
                {course.teacher.name}
                {course.teacher.isVerified && (
                  <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded">✓ Təsdiqlənmiş</span>
                )}
              </Link>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {course.tags.map(tag => (
                  <span key={tag} className="text-xs bg-white/5 border border-white/10 text-white/60 px-2.5 py-1 rounded-full">{tag}</span>
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
                  onCertificate={handleCertificate}
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
                onCertificate={handleCertificate}
              />
            </div>

            {/* Tabs */}
            <div className="relative border-b border-white/10">
              <div className="flex gap-0 overflow-x-auto scrollbar-none">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="course-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
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
                    <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
                      <h2 className="text-lg font-bold">Bu kursda nə öyrənəcəksiniz?</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {visibleLearn.map(item => (
                          <div key={item} className="flex items-start gap-2 text-sm text-white/80">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" className="mt-0.5 shrink-0">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {item}
                          </div>
                        ))}
                      </div>
                      {course.whatYoullLearn.length > 6 && (
                        <button
                          onClick={() => setShowAllLearn(o => !o)}
                          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
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
                          <li key={req} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <h2 className="text-lg font-bold">Kurs haqqında</h2>
                      <p className="text-white/70 leading-relaxed text-sm">{course.longDescription}</p>
                    </div>

                    {/* Stats bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Ümumi müddət', value: fmtDuration(course.duration) },
                        { label: 'Dərslər', value: `${totalLessons} dərs` },
                        { label: 'Yeniləndi', value: fmtDate(course.updatedAt) },
                        { label: 'Səviyyə', value: course.level },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/40 mb-1">{label}</p>
                          <p className="text-sm font-semibold capitalize">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Dərslər ──────────────────────────────────── */}
                {activeTab === 'Dərslər' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-white/60 text-sm">
                        {course.sections.length} bölmə · {totalLessons} dərs · {fmtDuration(course.duration)}
                      </p>
                      {!course.isEnrolled && (
                        <span className="text-xs text-white/40">Pulsuz dərslər açıqdır</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {displayedSections.map(section => (
                        <SectionAccordion
                          key={section.id}
                          section={section}
                          isEnrolled={course.isEnrolled}
                          onComplete={(lessonId) => completeMutation.mutate(lessonId)}
                        />
                      ))}
                    </div>
                    {course.sections.length > 3 && (
                      <button
                        onClick={() => setShowAllSections(o => !o)}
                        className="w-full py-3 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                      >
                        {showAllSections
                          ? 'Daha az göstər'
                          : `Bütün ${course.sections.length} bölməni göstər`}
                      </button>
                    )}
                  </div>
                )}

                {/* ── TAB 3: Rəylər ───────────────────────────────────── */}
                {activeTab === 'Rəylər' && (
                  <div className="space-y-6">
                    {/* Rating summary */}
                    <div className="flex gap-8 items-center">
                      <div className="text-center">
                        <p className="text-6xl font-bold text-yellow-400">{course.rating}</p>
                        <StarRating value={course.rating} size={20} />
                        <p className="text-xs text-white/40 mt-1">{course.reviewCount} rəy</p>
                      </div>
                      <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = star === 5 ? Math.round(course.reviewCount * 0.65)
                            : star === 4 ? Math.round(course.reviewCount * 0.22)
                            : star === 3 ? Math.round(course.reviewCount * 0.08)
                            : star === 2 ? Math.round(course.reviewCount * 0.03)
                            : Math.round(course.reviewCount * 0.02)
                          return <RatingBar key={star} label={`${star}★`} count={count} total={course.reviewCount} />
                        })}
                      </div>
                    </div>

                    {/* Review list */}
                    <div className="space-y-4">
                      {course.reviews.map(review => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/60 flex items-center justify-center text-sm font-bold">
                                {review.user.name[0]}
                              </div>
                              <span className="font-medium text-sm">{review.user.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StarRating value={review.rating} size={12} />
                              <span className="text-xs text-white/40">{fmtDate(review.createdAt)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed">{review.comment}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Write review (only enrolled) */}
                    {course.isEnrolled && (
                      <div className="bg-white/5 border border-dashed border-white/15 rounded-xl p-4 text-center">
                        <p className="text-sm text-white/60 mb-3">Kurs haqqında rəyinizi yazın</p>
                        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors">
                          Rəy yaz
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 4: Müəllim ──────────────────────────────────── */}
                {activeTab === 'Müəllim' && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-bold shrink-0">
                        {course.teacher.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold">{course.teacher.name}</h2>
                          {course.teacher.isVerified && (
                            <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">✓ Təsdiqlənmiş</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/50">
                          <span>⭐ {course.teacher.rating} reytinq</span>
                          <span>👥 {course.teacher.totalStudents.toLocaleString()} tələbə</span>
                          <span>📚 {course.teacher.courseCount} kurs</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/70 leading-relaxed">{course.teacher.bio}</p>
                    <Link
                      to={`/teachers/${course.teacher.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-colors"
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
                onCertificate={handleCertificate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
