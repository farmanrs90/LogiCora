import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'

// ── Types ──────────────────────────────────────────────────────────────────

interface CourseCard {
  _id:          string
  title:        string
  description:  string
  thumbnailUrl: string | null
  teacherId:    string
  teacherName:  string
  teacherAvatar: string
  teacherVerified: boolean
  price:        number
  discountPrice: number | null
  category:     string
  level:        'beginner' | 'intermediate' | 'advanced'
  ageGroup:     string[]
  rating:       number
  ratingCount:  number
  totalEnrolled: number
  isFeatured:   boolean
  language:     string
  totalDuration: number
  slug:         string
}

interface CoursePage {
  courses:  CourseCard[]
  nextPage: number | null
  total:    number
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

interface BackendTeacher {
  _id?: string
  displayName?: string
  name?: string
  surname?: string
  slug?: string
  avatarColor?: string
  isVerified?: boolean
  specialization?: string
}

interface BackendCourse {
  _id?: string
  id?: string
  title?: string
  description?: string
  thumbnail?: string | null
  thumbnailUrl?: string | null
  teacherId?: string | BackendTeacher
  teacherName?: string
  teacherAvatar?: string
  teacherVerified?: boolean
  price?: number
  discountPrice?: number | null
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  ageGroup?: string[]
  rating?: number
  ratingCount?: number
  totalEnrolled?: number
  isFeatured?: boolean
  language?: string
  totalDuration?: number
  slug?: string
}

type CourseListPayload = BackendCourse[] | CoursePage | { courses?: BackendCourse[]; nextPage?: number | null; total?: number }

interface FeaturedTeacher {
  _id:         string
  name:        string
  surname:     string
  slug:        string
  avatarColor: string
  specialty:   string
  rating:      number
  totalStudents: number
  isVerified:  boolean
  isFounding:  boolean
  isFeatured:  boolean
}

interface Filters {
  category:  string
  level:     string
  ageGroup:  string
  price:     string
  rating:    string
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_TEACHERS: FeaturedTeacher[] = [
  { _id: 't1', name: 'Əli',    surname: 'Həsənov', slug: 'ali-hasanov', avatarColor: '#9333EA', specialty: 'Riyaziyyat',      rating: 4.9, totalStudents: 340, isVerified: true,  isFounding: true,  isFeatured: true  },
  { _id: 't2', name: 'Günel',  surname: 'Muradova', slug: 'gunel-muradova', avatarColor: '#3B82F6', specialty: 'İngilis dili', rating: 4.8, totalStudents: 510, isVerified: true,  isFounding: true,  isFeatured: true  },
  { _id: 't3', name: 'Rəşad',  surname: 'Əliyev',  slug: 'rashad-aliyev',  avatarColor: '#22C55E', specialty: 'Proqramlaşdırma', rating: 4.7, totalStudents: 280, isVerified: true,  isFounding: false, isFeatured: true  },
  { _id: 't4', name: 'Nigar',  surname: 'Sultanova', slug: 'nigar-sultanova', avatarColor: '#F97316', specialty: 'Fizika',   rating: 4.6, totalStudents: 190, isVerified: true,  isFounding: false, isFeatured: false },
]

const CATEGORIES = [
  'Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'Coğrafiya',
  'İngilis dili', 'Proqramlaşdırma', 'Şahmat', 'Musiqi', 'İncəsənət',
]

const DEFAULT_FILTERS: Filters = { category: '', level: '', ageGroup: '', price: '', rating: '' }
const COURSE_PAGE_SIZE = 12

// ── Custom debounce hook ───────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h} s ${m} d` : `${m} dəq`
}

function teacherNameFrom(course: BackendCourse): string {
  if (course.teacherName) return course.teacherName
  const teacher = typeof course.teacherId === 'object' ? course.teacherId : null
  const fullName = [teacher?.name, teacher?.surname].filter(Boolean).join(' ')
  if (teacher?.displayName) return teacher.displayName
  if (fullName) return fullName
  if (teacher?.specialization) return `${teacher.specialization} müəllimi`
  return 'LogiCora müəllimi'
}

function normalizeCourse(raw: BackendCourse): CourseCard | null {
  const id = raw._id ?? raw.id
  if (!id) return null

  const teacher = typeof raw.teacherId === 'object' ? raw.teacherId : null
  const teacherId = typeof raw.teacherId === 'string' ? raw.teacherId : teacher?._id ?? ''

  return {
    _id: id,
    title: raw.title ?? 'Adsız kurs',
    description: raw.description ?? 'Bu kurs üçün açıqlama hələ əlavə edilməyib.',
    thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail ?? null,
    teacherId,
    teacherName: teacherNameFrom(raw),
    teacherAvatar: raw.teacherAvatar ?? teacher?.avatarColor ?? '#6366F1',
    teacherVerified: raw.teacherVerified ?? teacher?.isVerified ?? false,
    price: raw.price ?? 0,
    discountPrice: raw.discountPrice ?? null,
    category: raw.category ?? 'Ümumi',
    level: raw.level ?? 'beginner',
    ageGroup: raw.ageGroup ?? [],
    rating: raw.rating ?? 0,
    ratingCount: raw.ratingCount ?? 0,
    totalEnrolled: raw.totalEnrolled ?? 0,
    isFeatured: raw.isFeatured ?? false,
    language: raw.language ?? 'az',
    totalDuration: raw.totalDuration ?? 0,
    slug: raw.slug ?? id,
  }
}

function clientFilterCourses(courses: CourseCard[], search: string, filters: Filters): CourseCard[] {
  const query = search.trim().toLowerCase()

  return courses.filter((course) => {
    if (query && !course.title.toLowerCase().includes(query) && !course.category.toLowerCase().includes(query)) return false
    if (filters.category && course.category !== filters.category) return false
    if (filters.level && course.level !== filters.level) return false
    if (filters.ageGroup && !course.ageGroup.includes(filters.ageGroup)) return false
    if (filters.price === 'free' && course.price !== 0) return false
    if (filters.price === 'paid' && course.price === 0) return false
    if (filters.rating && course.rating < Number(filters.rating)) return false
    return true
  })
}

function unwrapCoursePage(
  envelope: ApiEnvelope<CourseListPayload>,
  page: number,
  search: string,
  filters: Filters
): CoursePage {
  const payload = envelope.data
  const rawCourses = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.courses)
      ? payload.courses
      : []

  const courses = clientFilterCourses(
    rawCourses.map(normalizeCourse).filter((course): course is CourseCard => course !== null),
    search,
    filters
  )

  const nextPage = Array.isArray(payload)
    ? null
    : payload.nextPage ?? null

  return {
    courses,
    nextPage: nextPage && nextPage > page ? nextPage : null,
    total: courses.length,
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

function CoursesErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-10 text-center">
      <div className="mb-3 text-4xl">⚠️</div>
      <h3 className="mb-2 text-xl font-bold text-white">Kurslar yüklənmədi</h3>
      <p className="mx-auto max-w-md text-sm leading-6 text-[#FCA5A5]">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #EF4444, #9333EA)' }}
      >
        Yenidən yoxla
      </button>
    </div>
  )
}

function StarRating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= Math.round(value) ? '#EAB308' : '#374151' }}>★</span>
      ))}
    </span>
  )
}

// ── Course card skeleton ───────────────────────────────────────────────────

function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="aspect-video bg-white/10" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-white/10 rounded w-1/3" />
        <div className="h-5 bg-white/10 rounded w-4/5" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-3/4" />
        <div className="flex gap-2 mt-2">
          <div className="h-3 bg-white/10 rounded w-16" />
          <div className="h-3 bg-white/10 rounded w-20" />
        </div>
      </div>
    </div>
  )
}

// ── Course card ────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Başlanğıc', intermediate: 'Orta', advanced: 'İrəliləmiş',
}
const LEVEL_COLORS: Record<string, string> = {
  beginner: '#22C55E', intermediate: '#EAB308', advanced: '#EF4444',
}

function CourseCardComponent({ course }: { course: CourseCard }) {
  const [hovered, setHovered] = useState(false)
  const isFree = course.price === 0

  const CATEGORY_EMOJIS: Record<string, string> = {
    'Riyaziyyat': '📐', 'Fizika': '⚛️', 'Kimya': '🧪', 'Biologiya': '🌿',
    'Tarix': '📜', 'Coğrafiya': '🌍', 'İngilis dili': '🇬🇧',
    'Proqramlaşdırma': '💻', 'Şahmat': '♟️', 'Musiqi': '🎵', 'İncəsənət': '🎨',
  }

  return (
    <Link to={APP_ROUTES.COURSE(course._id)}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background:  'rgba(255,255,255,0.04)',
          border:      `1px solid ${course.isFeatured ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow:   hovered ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Featured animated border */}
        {course.isFeatured && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ border: '1px solid rgba(255,215,0,0.5)', borderRadius: 16 }}
          />
        )}

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-6xl"
              style={{ background: `linear-gradient(135deg, ${course.teacherAvatar}20, ${course.teacherAvatar}08)` }}
            >
              {CATEGORY_EMOJIS[course.category] ?? '📚'}
            </div>
          )}

          {/* Price badge */}
          <div className="absolute top-2.5 right-2.5">
            {isFree ? (
              <span className="px-2 py-1 rounded-lg text-xs font-black"
                style={{ background: 'rgba(34,197,94,0.9)', color: 'white' }}>
                Pulsuz
              </span>
            ) : (
              <div className="text-right">
                {course.discountPrice && (
                  <div className="text-[10px] line-through text-white/60 text-right">{course.price} ₼</div>
                )}
                <span className="px-2 py-1 rounded-lg text-xs font-black"
                  style={{ background: 'rgba(234,179,8,0.9)', color: 'white' }}>
                  {course.discountPrice ?? course.price} ₼
                </span>
              </div>
            )}
          </div>

          {/* Level */}
          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
              style={{ background: `${LEVEL_COLORS[course.level]}20`, color: LEVEL_COLORS[course.level], border: `1px solid ${LEVEL_COLORS[course.level]}30` }}>
              {LEVEL_LABELS[course.level]}
            </span>
          </div>

          {/* Hover overlay */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="px-5 py-2.5 rounded-2xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
                >
                  Kursa bax →
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          {/* Category chip */}
          <span className="text-[11px] font-bold mb-2" style={{ color: '#9CA3AF' }}>
            {CATEGORY_EMOJIS[course.category]} {course.category}
          </span>

          {/* Title */}
          <h3 className="text-white font-bold text-sm leading-snug mb-1.5 line-clamp-2 flex-1">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-[#9CA3AF] text-xs leading-relaxed mb-3 line-clamp-2">
            {course.description}
          </p>

          {/* Teacher */}
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black"
              style={{ backgroundColor: course.teacherAvatar, fontSize: 9 }}
            >
              {course.teacherName.charAt(0)}
            </div>
            <span className="text-[#9CA3AF] text-[11px] truncate">{course.teacherName}</span>
            {course.teacherVerified && (
              <span className="text-blue-400 text-[10px] font-bold flex-shrink-0">✓</span>
            )}
          </div>

          {/* Rating + stats */}
          <div className="flex items-center gap-3 mt-auto">
            <div className="flex items-center gap-1">
              <StarRating value={course.rating} size={11} />
              <span className="text-[#EAB308] text-xs font-bold">{course.rating.toFixed(1)}</span>
              <span className="text-[#9CA3AF] text-[10px]">({course.ratingCount})</span>
            </div>
            <span className="text-[#9CA3AF] text-[10px]">👥 {course.totalEnrolled}</span>
            <span className="text-[#9CA3AF] text-[10px] ml-auto">⏱ {fmtDuration(course.totalDuration)}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Featured teacher card ──────────────────────────────────────────────────

function FeaturedTeacherCard({ t }: { t: FeaturedTeacher }) {
  return (
    <Link to={APP_ROUTES.TEACHER(t.slug)}>
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl w-36 transition-all"
        style={{
          background: t.isFeatured ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.04)',
          border:     `1px solid ${t.isFeatured ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {/* Avatar */}
        <div className="relative">
          <motion.div
            animate={t.isFeatured ? { boxShadow: [`0 0 0 2px ${t.avatarColor}40`, `0 0 0 6px ${t.avatarColor}10`, `0 0 0 2px ${t.avatarColor}40`] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-xl"
            style={{ backgroundColor: t.avatarColor }}
          >
            {t.name.charAt(0)}
          </motion.div>
          {t.isVerified && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-black">✓</span>
          )}
        </div>

        <div className="text-center">
          <p className="text-white font-bold text-xs">{t.name} {t.surname}</p>
          <p className="text-[#9CA3AF] text-[10px] mt-0.5">{t.specialty}</p>
        </div>

        {t.isFounding && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
            style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
            🥇 Qurucu
          </span>
        )}

        <div className="flex items-center gap-1">
          <span className="text-[#EAB308] text-[10px]">★</span>
          <span className="text-white text-[10px] font-bold">{t.rating}</span>
          <span className="text-[#9CA3AF] text-[10px]">·</span>
          <span className="text-[#9CA3AF] text-[10px]">{t.totalStudents}</span>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Filter panel ───────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters:   Filters
  onChange:  (f: Filters) => void
  onReset:   () => void
  onClose?:  () => void
}

function FilterPanel({ filters, onChange, onReset, onClose }: FilterPanelProps) {
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  function chip(key: keyof Filters, value: string, label: string) {
    const active = filters[key] === value
    return (
      <button
        key={value}
        onClick={() => onChange({ ...filters, [key]: active ? '' : value })}
        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
        style={{
          background: active ? `${avatarColor}20` : 'rgba(255,255,255,0.04)',
          border:     `1px solid ${active ? `${avatarColor}40` : 'rgba(255,255,255,0.08)'}`,
          color:      active ? avatarColor : '#9CA3AF',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-black text-base">Filterlər</h3>
        {onClose && (
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white text-xl">×</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Category */}
        <div>
          <p className="text-[#9CA3AF] text-xs font-bold mb-2">📚 Kateqoriya</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => chip('category', c, c))}
          </div>
        </div>

        {/* Level */}
        <div>
          <p className="text-[#9CA3AF] text-xs font-bold mb-2">📊 Səviyyə</p>
          <div className="flex flex-wrap gap-1.5">
            {[['beginner','Başlanğıc'], ['intermediate','Orta'], ['advanced','İrəliləmiş']].map(([v,l]) => chip('level', v, l))}
          </div>
        </div>

        {/* Age */}
        <div>
          <p className="text-[#9CA3AF] text-xs font-bold mb-2">👦 Yaş Qrupu</p>
          <div className="flex flex-wrap gap-1.5">
            {[['3-8','3-8 yaş'], ['9-14','9-14 yaş'], ['15+','15+ yaş']].map(([v,l]) => chip('ageGroup', v, l))}
          </div>
        </div>

        {/* Price */}
        <div>
          <p className="text-[#9CA3AF] text-xs font-bold mb-2">💰 Qiymət</p>
          <div className="flex flex-wrap gap-1.5">
            {[['free','Pulsuz'], ['paid','Ödənişli']].map(([v,l]) => chip('price', v, l))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <p className="text-[#9CA3AF] text-xs font-bold mb-2">⭐ Reytinq</p>
          <div className="flex flex-wrap gap-1.5">
            {[['4','4+ ★'], ['3','3+ ★']].map(([v,l]) => chip('rating', v, l))}
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10 hover:text-white transition-colors mt-4"
      >
        Filterləri Sıfırla
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function CourseList() {
  const avatarColor    = useSelector((s: RootState) => s.theme.avatarColor)
  const [search,       setSearch]       = useState('')
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS)
  const [showDrawer,   setShowDrawer]   = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const loaderRef       = useRef<HTMLDivElement>(null)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: featuredTeachers } = useQuery<FeaturedTeacher[]>({
    queryKey: ['teachers', 'featured'],
    queryFn:  () => api.get<{ data: FeaturedTeacher[] }>(API_ROUTES.TEACHERS.FEATURED)
                      .then(r => r.data.data)
                      .catch(() => MOCK_TEACHERS),
    staleTime: 1000 * 60 * 5,
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['courses', debouncedSearch, filters],
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam)
      const response = await api.get<ApiEnvelope<CourseListPayload>>(API_ROUTES.COURSES.LIST, {
        params: { page, limit: COURSE_PAGE_SIZE, search: debouncedSearch, ...filters },
      })
      return unwrapCoursePage(response.data, page, debouncedSearch, filters)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: CoursePage) => lastPage.nextPage ?? undefined,
  })

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  const allCourses = data?.pages.flatMap(p => p.courses) ?? []
  const teachers   = featuredTeachers ?? MOCK_TEACHERS
  const totalCourses = data?.pages[0]?.total ?? 0

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-4 pt-10 pb-8"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${avatarColor}08 0%, transparent 100%)` }}
        />
        <div className="relative max-w-5xl mx-auto">
          {/* Logi */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <span className="text-2xl">🤖</span>
            <div
              className="px-3 py-1.5 rounded-2xl text-sm text-white/80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              "Bilikini artır, gələcəyini qur!" ✨
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-black text-3xl mb-1"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🎓 Kurs bazarı
          </motion.h1>
          <p className="text-[#9CA3AF] text-sm mb-6">
            {isLoading ? 'Kurslar yüklənir...' : `${totalCourses} kurs mövcuddur`}
          </p>

          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-xl">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Kurs axtar... (Riyaziyyat, Python, İngilis dili...)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.12)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${avatarColor}60` }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">🔍</span>
            </div>

            {/* Mobile filter button */}
            <motion.button
              onClick={() => setShowDrawer(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="lg:hidden relative px-4 py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              🎛️ Filterlər
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                  style={{ background: avatarColor }}
                >
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">

        {/* ── FEATURED TEACHERS ─────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-white font-bold text-sm mb-3">🌟 Tövsiyə olunan müəllimlər</p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {teachers.map(t => <FeaturedTeacherCard key={t._id} t={t} />)}
          </div>
        </div>

        {/* ── MAIN LAYOUT ───────────────────────────────────────────────── */}
        <div className="flex gap-6">

          {/* Sidebar — desktop */}
          <aside
            className="hidden lg:block w-56 flex-shrink-0 sticky top-6 self-start h-[calc(100vh-120px)] overflow-hidden rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </aside>

          {/* Course grid */}
          <div className="flex-1 min-w-0">
            {/* Active filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
                  <motion.button
                    key={k}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setFilters(f => ({ ...f, [k]: '' }))}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                    style={{ background: `${avatarColor}15`, color: avatarColor, border: `1px solid ${avatarColor}30` }}
                  >
                    {v} ×
                  </motion.button>
                ))}
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-[#9CA3AF] text-xs hover:text-white"
                >
                  Hamısını sil
                </button>
              </div>
            )}

            {/* Grid */}
            {isError ? (
              <CoursesErrorState
                message={errorMessage(error, 'Kurs siyahısı alınmadı. Zəhmət olmasa bir az sonra yenidən yoxlayın.')}
                onRetry={() => void refetch()}
              />
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            ) : allCourses.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-white font-bold text-xl mb-2">Kurs tapılmadı</h3>
                <p className="text-[#9CA3AF] text-sm">Axtarış sözünü dəyişin və ya filterləri sıfırlayın.</p>
                <button
                  onClick={() => { setSearch(''); setFilters(DEFAULT_FILTERS) }}
                  className="mt-4 px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, #9333EA)` }}
                >
                  Sıfırla
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {allCourses.map((course, i) => (
                      <motion.div
                        key={course._id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      >
                        <CourseCardComponent course={course} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Infinite scroll loader */}
                <div ref={loaderRef} className="py-8 flex justify-center">
                  {isFetchingNextPage && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
                      className="w-8 h-8 rounded-full border-2 border-t-transparent"
                      style={{ borderColor: `${avatarColor} ${avatarColor}30 ${avatarColor}30 ${avatarColor}30` }}
                    />
                  )}
                  {!hasNextPage && allCourses.length > 6 && (
                    <p className="text-[#9CA3AF] text-xs">Bütün kurslar yükləndi ✓</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 p-5 overflow-y-auto"
              style={{ background: '#111827', borderRight: '1px solid rgba(255,255,255,0.1)' }}
            >
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                onClose={() => setShowDrawer(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
