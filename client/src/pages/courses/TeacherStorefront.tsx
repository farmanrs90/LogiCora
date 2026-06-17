import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/axios'
import { API_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherCourse {
  id: string
  title: string
  thumbnail: string
  price: number
  discountedPrice?: number
  isFree: boolean
  rating: number
  studentCount: number
  level: string
  isPublished: boolean
  isFeatured: boolean
}

interface TeacherCompetition {
  id: string
  title: string
  subject: string
  participantCount: number
  status: 'upcoming' | 'active' | 'ended'
  scheduledAt: string
}

interface TeacherReview {
  id: string
  user: { name: string }
  rating: number
  comment: string
  courseName: string
  createdAt: string
}

interface TeacherProfile {
  id: string
  name: string
  slug: string
  avatar?: string
  coverImage?: string
  isVerified: boolean
  isFoundingTeacher: boolean
  isFeatured: boolean
  bio: string
  longBio: string
  introVideoUrl?: string
  subject: string
  city: string
  school?: string
  yearsExperience: number
  totalStudents: number
  rating: number
  reviewCount: number
  courseCount: number
  impactScore: number
  socialLinks: { platform: string; url: string }[]
  courses: TeacherCourse[]
  competitions: TeacherCompetition[]
  reviews: TeacherReview[]
  showcaseCourseIds: string[]
}

type TeacherApiProfile = Omit<Partial<TeacherProfile>, 'socialLinks'> & {
  _id?: string
  displayName?: string
  userId?: string | { _id?: string; name?: string; surname?: string }
  specialization?: string
  experience?: number
  introVideo?: string
  socialLinks?: TeacherProfile['socialLinks'] | Record<string, string | null | undefined>
}

interface ApiEnvelope<T> {
  success?: boolean
  data?: T | null
  message?: string
}

interface EditProfileForm {
  bio: string
  longBio: string
  city: string
  school: string
  yearsExperience: number
  subject: string
}

const TEACHER_SPECIALIZATIONS = [
  'mathematics',
  'language',
  'science',
  'history',
  'physical_education',
  'art',
  'music',
  'other',
] as const

type TeacherSpecialization = typeof TEACHER_SPECIALIZATIONS[number]

interface TeacherProfileUpdatePayload {
  bio: string
  experience: number
  specialization?: TeacherSpecialization
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  const date = iso ? new Date(iso) : null

  if (!date || Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('az-AZ', { year: 'numeric', month: 'short', day: 'numeric' })
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isApiEnvelope(response: TeacherApiProfile | ApiEnvelope<TeacherApiProfile>): response is ApiEnvelope<TeacherApiProfile> {
  return typeof response === 'object' && (
    'data' in response ||
    'success' in response ||
    'message' in response
  )
}

function unwrapTeacherResponse(
  response: TeacherApiProfile | ApiEnvelope<TeacherApiProfile> | null | undefined
): TeacherApiProfile | null {
  if (!response) {
    return null
  }

  if (isApiEnvelope(response)) {
    return response.data ?? null
  }

  return response
}

function normalizeSocialLinks(links: TeacherApiProfile['socialLinks']): TeacherProfile['socialLinks'] {
  if (Array.isArray(links)) {
    return links.filter(link => !!link?.url)
  }

  if (!links || typeof links !== 'object') {
    return []
  }

  return Object.entries(links)
    .filter(([, url]) => typeof url === 'string' && url.length > 0)
    .map(([platform, url]) => ({ platform, url: url as string }))
}

function getTeacherUserId(userId: TeacherApiProfile['userId']): string | undefined {
  if (typeof userId === 'string') {
    return userId
  }

  return userId?._id
}

function getTeacherUserName(userId: TeacherApiProfile['userId']): string {
  if (!userId || typeof userId === 'string') {
    return ''
  }

  return [userId.name, userId.surname].filter(Boolean).join(' ')
}

function isTeacherSpecialization(value: string | undefined): value is TeacherSpecialization {
  return !!value && TEACHER_SPECIALIZATIONS.includes(value as TeacherSpecialization)
}

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return 'Profil yenilənmədi. Zəhmət olmasa yenidən cəhd edin.'
}

function buildTeacherProfileUpdatePayload(data: EditProfileForm): TeacherProfileUpdatePayload {
  const subject = data.subject.trim()

  if (subject && !isTeacherSpecialization(subject)) {
    throw new Error(`Fənn yalnız backend contract dəyərlərindən biri ola bilər: ${TEACHER_SPECIALIZATIONS.join(', ')}`)
  }

  const payload: TeacherProfileUpdatePayload = {
    bio: data.bio,
    experience: Number.isFinite(data.yearsExperience) ? Math.max(0, Math.trunc(data.yearsExperience)) : 0,
  }

  if (isTeacherSpecialization(subject)) {
    payload.specialization = subject
  }

  return payload
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= Math.round(value) ? '#FACC15' : 'none'}
          stroke="#FACC15" strokeWidth="1.5"
        >
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────

function MiniCourseCard({ course }: { course: TeacherCourse }) {
  const originalPrice = safeNumber(course.price)
  const price = safeNumber(course.discountedPrice ?? course.price)
  const rating = safeNumber(course.rating)
  const studentCount = safeNumber(course.studentCount)
  const hasDiscount = typeof course.discountedPrice === 'number' && originalPrice > 0 && course.discountedPrice < originalPrice

  return (
    <Link to={course.id ? `/courses/${course.id}` : '/courses'} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        className={`bg-[#141414] border rounded-2xl overflow-hidden transition-colors ${
          course.isFeatured
            ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="relative aspect-video overflow-hidden bg-black">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          />
          {course.isFeatured && (
            <div className="absolute top-2 left-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
              Seçilmiş
            </div>
          )}
          <div className="absolute top-2 right-2">
            {course.isFree ? (
              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">Pulsuz</span>
            ) : hasDiscount ? (
              <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-semibold">
                {Math.round(((originalPrice - price) / originalPrice) * 100)}% endirim
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="capitalize">{course.level}</span>
            <span>·</span>
            <span>{studentCount.toLocaleString()} tələbə</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StarRating value={rating} size={12} />
              <span className="text-xs text-yellow-400 font-semibold">{rating}</span>
            </div>
            {!course.isFree && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{price} ₼</span>
                {course.discountedPrice && (
                  <span className="text-xs text-white/30 line-through">{course.price} ₼</span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  teacher,
  onClose,
}: {
  teacher: TeacherApiProfile
  onClose: () => void
}) {
  const qc = useQueryClient()
  const unsupportedFieldHelper = 'Bu məlumat hazırda profil saxlanmasına qoşulmayıb.'
  const initialForm: EditProfileForm = {
    bio: teacher.bio ?? '',
    longBio: teacher.longBio ?? teacher.bio ?? '',
    city: teacher.city ?? '',
    school: teacher.school ?? '',
    yearsExperience: safeNumber(teacher.yearsExperience ?? teacher.experience),
    subject: teacher.subject ?? teacher.specialization ?? '',
  }
  const [form, setForm] = useState<EditProfileForm>(initialForm)

  const updateMutation = useMutation({
    mutationFn: (data: EditProfileForm) =>
      api.put('/teachers', buildTeacherProfileUpdatePayload(data)).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      toast.dismiss('teacher-profile-update-error')
      toast.success('Profil yeniləndi.')
      onClose()
    },
    onError: (error) => {
      // Backend xətası: lokal cache yenilənmir, modal AÇIQ qalır — fake success yoxdur.
      // Müəllim düzəliş edib yenidən cəhd edə bilsin.
      toast.error(getApiErrorMessage(error), { id: 'teacher-profile-update-error' })
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold">Profili düzənlə</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Qısa bio</label>
            <input
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Qısa bio..."
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Haqqında (ətraflı)</label>
            <textarea
              value={form.longBio}
              readOnly
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/45 focus:outline-none transition-colors resize-none cursor-not-allowed"
              placeholder="Özünüz haqqında ətraflı yazın..."
            />
            <p className="mt-1 text-[11px] text-white/35">{unsupportedFieldHelper}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Şəhər</label>
              <input
                value={form.city}
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/45 focus:outline-none transition-colors cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-white/35">{unsupportedFieldHelper}</p>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Təcrübə (il)</label>
              <input
                type="number"
                value={form.yearsExperience}
                onChange={e => setForm(f => ({ ...f, yearsExperience: +e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                min={0}
                max={50}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Fənn</label>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Məktəb / Universitet</label>
            <input
              value={form.school}
              readOnly
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/45 focus:outline-none transition-colors cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-white/35">{unsupportedFieldHelper}</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            Ləğv et
          </button>
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saxlanır...' : 'Yadda saxla'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TABS = ['Kurslar', 'Yarışmalar', 'Rəylər', 'Haqqında'] as const
type Tab = typeof TABS[number]

export default function TeacherStorefront() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Kurslar')
  const [showEditModal, setShowEditModal] = useState(false)

  const { data: teacher, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher', slug],
    queryFn: () =>
      api.get<TeacherApiProfile | ApiEnvelope<TeacherApiProfile> | null>(API_ROUTES.TEACHERS.BY_SLUG(slug!))
        .then(r => unwrapTeacherResponse(r.data)),
    enabled: !!slug,
    // Profil tapılmayanda (404) təkrar sorğu atma — konsol 404 spam-ını dayandırır,
    // istifadəçiyə dərhal honest error/empty state göstərilir.
    retry: false,
  })

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] animate-pulse">
        <div className="h-72 bg-white/10" />
        <div className="max-w-5xl mx-auto px-4 -mt-16 space-y-4">
          <div className="w-32 h-32 rounded-2xl bg-white/10" />
          <div className="h-8 bg-white/10 rounded-xl w-48" />
          <div className="h-4 bg-white/10 rounded-xl w-80" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-300">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Müəllim profili yüklənmədi.</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Yenidən yoxla
            </button>
            <Link
              to="/courses"
              className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              Kurslara qayıt
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!teacher || !(teacher.id || teacher._id || teacher.slug || teacher.name || teacher.displayName || teacher.userId)) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            ?
          </div>
          <h1 className="text-xl font-bold">Bu müəllim profili mövcud deyil.</h1>
        </div>
      </div>
    )
  }

  const courses = Array.isArray(teacher.courses) ? teacher.courses : []
  const competitions = Array.isArray(teacher.competitions) ? teacher.competitions : []
  const reviews = Array.isArray(teacher.reviews) ? teacher.reviews : []
  const socialLinks = normalizeSocialLinks(teacher.socialLinks)
  const totalStudents = safeNumber(teacher.totalStudents)
  const rating = safeNumber(teacher.rating)
  const reviewCount = safeNumber(teacher.reviewCount)
  const courseCount = safeNumber(teacher.courseCount, courses.length)
  const yearsExperience = safeNumber(teacher.yearsExperience ?? teacher.experience)
  const impactScore = safeNumber(teacher.impactScore)
  const teacherId = teacher.id || teacher._id
  const teacherUserId = getTeacherUserId(teacher.userId)
  const teacherUserName = getTeacherUserName(teacher.userId)
  const teacherName = teacher.name || teacher.displayName || teacherUserName || 'Müəllim'
  const teacherInitial = teacherName[0] ?? '?'
  const teacherSubject = teacher.subject || teacher.specialization || '—'
  const teacherCity = teacher.city || '—'
  const teacherBio = teacher.bio || ''
  const teacherLongBio = teacher.longBio || teacher.bio || '—'
  const introVideoUrl = teacher.introVideoUrl || teacher.introVideo
  const currentUserId = user?._id
  const isOwner = Boolean(currentUserId && (currentUserId === teacherUserId || currentUserId === teacherId))

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* ── Cover Image ─────────────────────────────────────────────────────── */}
      <div className="relative h-72 overflow-hidden">
        {teacher.coverImage ? (
          <img src={teacher.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-purple-950 to-[#0D0D0D]" />
        )}
        {/* Animated grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />

        {/* Owner controls */}
        {isOwner && (
          <div className="absolute top-4 right-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg text-xs text-white/70 hover:text-white hover:border-white/40 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Cover dəyiş
            </button>
          </div>
        )}
      </div>

      {/* ── Profile section (negative margin avatar) ─────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 relative z-10 pb-6 border-b border-white/10">
          {/* Avatar — negative margin pulls it over cover */}
          <div className="relative shrink-0">
            {teacher.isFeatured && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ boxShadow: '0 0 30px 10px rgba(99,102,241,0.4)', borderRadius: '1rem' }}
              />
            )}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 border-4 border-[#0D0D0D] flex items-center justify-center text-4xl font-bold shadow-xl">
              {teacher.avatar ? (
                <img src={teacher.avatar} alt={teacherName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                teacherInitial
              )}
            </div>
            {teacher.isFoundingTeacher && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[10px] bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">
                  🥇 Qurucu
                </span>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{teacherName}</h1>
              {teacher.isVerified && (
                <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  ✓ Təsdiqlənmiş
                </span>
              )}
            </div>
            <p className="text-white/60 text-sm mb-2">{teacherSubject} · {teacherCity}</p>
            <p className="text-white/70 text-sm max-w-xl">{teacherBio}</p>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-2 mt-3">
                {socialLinks.map(link => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    aria-label={link.platform}
                  >
                    {link.platform === 'github' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                      </svg>
                    )}
                    {link.platform === 'linkedin' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Owner: Edit button */}
          {isOwner && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Profili düzənlə
            </button>
          )}
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-6 border-b border-white/10">
          {[
            { label: 'Tələbə', value: totalStudents.toLocaleString(), icon: '👥' },
            { label: 'Reytinq', value: rating.toFixed(1), icon: '⭐' },
            { label: 'Kurs', value: courseCount.toString(), icon: '📚' },
            { label: 'Təcrübə', value: `${yearsExperience} il`, icon: '🏆' },
            { label: 'Impact Skoru', value: impactScore.toLocaleString(), icon: '⚡' },
          ].map(({ label, value, icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Intro video ──────────────────────────────────────────────────── */}
        {(introVideoUrl || isOwner) && (
          <div className="py-6 border-b border-white/10">
            <h2 className="text-base font-semibold mb-3">Tanıtım Videosu</h2>
            {introVideoUrl ? (
              <div className="aspect-video max-w-2xl rounded-2xl overflow-hidden bg-black">
                <video
                  src={introVideoUrl}
                  controls
                  className="w-full h-full"
                />
              </div>
            ) : isOwner ? (
              <div className="aspect-video max-w-2xl rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-3 text-white/40 cursor-pointer hover:border-indigo-500/40 hover:text-indigo-400 transition-colors">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <div className="text-center">
                  <p className="font-medium">Video əlavə et</p>
                  <p className="text-xs mt-0.5">Tələbələrə özünüzü tanıdın</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="relative border-b border-white/10 mt-2">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="teacher-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────── */}
        <div className="py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Kurslar ─────────────────────────────────────────────── */}
              {activeTab === 'Kurslar' && (
                <div className="space-y-6">
                  {isOwner && (
                    <div className="flex justify-end">
                      <Link
                        to="/dashboard/teacher"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Yeni kurs
                      </Link>
                    </div>
                  )}
                  {courses.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="text-6xl">📚</div>
                      <p className="text-white/50">Hələ ki heç bir kurs yoxdur</p>
                      {isOwner && (
                        <Link to="/dashboard/teacher" className="inline-block text-sm text-indigo-400 hover:text-indigo-300">
                          İlk kursunuzu əlavə edin →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {courses.map((course, i) => (
                        <motion.div
                          key={course.id || `course-${i}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <MiniCourseCard course={course} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Yarışmalar ──────────────────────────────────────────── */}
              {activeTab === 'Yarışmalar' && (
                <div className="space-y-4">
                  {competitions.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="text-6xl mb-3">🏆</div>
                      <p className="text-white/50">Hələ ki heç bir yarışma yoxdur</p>
                    </div>
                  ) : competitions.map((comp, i) => (
                    <motion.div
                      key={comp.id || `competition-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-white/20 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{comp.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            comp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            comp.status === 'upcoming' ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-white/10 text-white/40'
                          }`}>
                            {comp.status === 'active' ? '● Canlı' : comp.status === 'upcoming' ? 'Gələcək' : 'Bitdi'}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          {comp.subject} · {safeNumber(comp.participantCount)} iştirakçı · {fmtDate(comp.scheduledAt)}
                        </p>
                      </div>
                      <Link
                        to={comp.id ? `/competition/${comp.id}` : '/competition'}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 ml-4"
                      >
                        Gör →
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Rəylər ──────────────────────────────────────────────── */}
              {activeTab === 'Rəylər' && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-yellow-400">{rating.toFixed(1)}</p>
                      <StarRating value={rating} size={18} />
                      <p className="text-xs text-white/40 mt-1">{reviewCount} rəy</p>
                    </div>
                    <div className="w-px h-16 bg-white/10" />
                    <div className="flex-1 text-sm text-white/60 leading-relaxed">
                      {reviewCount > 0
                        ? `${reviewCount} rəy əsasında ortalama reytinq.`
                        : 'Bu müəllim üçün hələ rəy yoxdur.'}
                    </div>
                  </div>

                  {/* Reviews */}
                  {reviews.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-white/50">Hələ ki heç bir rəy yoxdur</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review, i) => {
                        const reviewerName = review.user?.name || 'İstifadəçi'
                        const reviewRating = safeNumber(review.rating)

                        return (
                          <motion.div
                            key={review.id || `review-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-600/60 flex items-center justify-center text-sm font-bold">
                                  {reviewerName[0] ?? '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{reviewerName}</p>
                                  <p className="text-xs text-white/40">{review.courseName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <StarRating value={reviewRating} size={12} />
                                <span className="text-xs text-white/40">{fmtDate(review.createdAt)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">{review.comment}</p>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Haqqında ────────────────────────────────────────────── */}
              {activeTab === 'Haqqında' && (
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold mb-3">Müəllim haqqında</h2>
                    <p className="text-white/70 leading-relaxed">{teacherLongBio}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Fənn', value: teacherSubject },
                      { label: 'Şəhər', value: teacherCity },
                      { label: 'Müəssisə', value: teacher.school ?? '—' },
                      { label: 'Təcrübə', value: `${yearsExperience} il` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-xs text-white/40 mb-1">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* CRM panel — owner only */}
                  {isOwner && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-indigo-300">Müəllim CRM Paneli</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Bu ay tələbə', value: '—' },
                          { label: 'Aktiv kurslar', value: courses.filter(c => c.isPublished).length.toString() },
                          { label: 'Bu ay gəlir', value: '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-indigo-300">{value}</p>
                            <p className="text-xs text-indigo-400/70 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/dashboard/teacher"
                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-indigo-500/30 rounded-xl text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        Tam CRM panelini aç
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal
            teacher={teacher}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
