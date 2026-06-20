import { useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useInView } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../lib/axios'
import { API_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'

// ── Types (shared subset with MyPortfolio) ────────────────────────────────────

interface Skill {
  subject: string
  stars: number
  xp: number
  level: number
  accuracy: number
  isWeak: boolean
  weakUntil?: string
  isVerified: boolean
  questionsAnswered: number
  worlds?: { unlocked: number; total: number }
}

type TimelineEventType = 'course' | 'competition' | 'badge' | 'milestone' | 'level' | 'mystery'

interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  subtitle?: string
  date: string
  meta?: string
  badgeEmoji?: string
  rank?: number
  level?: number
  isMystery?: boolean
}

interface Badge {
  id: string
  name: string
  emoji: string
  earnedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
}

interface Certificate {
  id: string
  courseName: string
  teacherName: string
  issuedAt: string
  certUrl?: string
}

interface CompetitionHistory {
  id: string
  title: string
  rank: number
  score: number
  totalParticipants: number
  date: string
  subject: string
}

interface PublicPortfolioData {
  user: {
    id: string
    name: string
    avatar?: string
    ageGroup: string
    city: string
    school?: string
    bio?: string
    joinedAt: string
    level: number
    league: string
    eloRating?: number
  }
  stats: {
    totalXP: number
    currentStreak: number
    longestStreak: number
    totalQuestions: number
    accuracy: number
    rank: number
  }
  skills: Skill[]
  badges: Badge[]
  timeline: TimelineEvent[]
  certificates: Certificate[]
  competitions: CompetitionHistory[]
  shareLink: string
  isPublic: boolean
  isConnected?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#B45309', silver: '#64748B', gold: '#D97706', platinum: '#0EA5E9', diamond: '#7C3AED',
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-200 bg-gray-50',
  rare: 'border-blue-200 bg-blue-50',
  epic: 'border-purple-200 bg-purple-50',
  legendary: 'border-amber-300 bg-amber-50',
}

const SUBJECT_META: Record<string, { emoji: string; color: string }> = {
  'Riyaziyyat': { emoji: '🔢', color: '#2563EB' },
  'Fizika':     { emoji: '⚗️', color: '#7C3AED' },
  'İnformatika':{ emoji: '💻', color: '#059669' },
  'Kimya':      { emoji: '🔬', color: '#EA580C' },
  'Biologiya':  { emoji: '🌿', color: '#16A34A' },
  'Tarix':      { emoji: '📜', color: '#D97706' },
  'Dil':        { emoji: '📖', color: '#DB2777' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

function isYoung(ag: string): boolean { return ['3-5', '6-8'].includes(ag) }
function isTeen(ag: string): boolean { return ['9-11', '12-14'].includes(ag) }

function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= count ? '#F59E0B' : '#E5E7EB'}
          stroke={i <= count ? '#F59E0B' : '#D1D5DB'}
          strokeWidth="1"
        >
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

// Bölmə boş olduqda — dürüst empty state (fake nailiyyət göstərilmir).
function SectionEmpty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-gray-400">{text}</p>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// ── Meta tags (OG) ────────────────────────────────────────────────────────────

function setMetaTags(portfolio: PublicPortfolioData) {
  document.title = `${portfolio.user.name} — LogiCora Portfolio`
  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el) }
    el.setAttribute('content', content)
  }
  setMeta('og:title', `${portfolio.user.name} — LogiCora`)
  setMeta('og:description', `Səviyyə ${portfolio.user.level} · ${portfolio.user.league} liqa · ${portfolio.stats.totalXP.toLocaleString()} XP`)
  setMeta('og:url', `https://${portfolio.shareLink}`)
  setMeta('og:type', 'profile')
}

function getErrorStatus(error: unknown): number | null {
  if (!isRecord(error)) return null
  const response = error.response
  if (!isRecord(response)) return null
  return typeof response.status === 'number' ? response.status : null
}

function getErrorMessage(error: unknown): string {
  if (!isRecord(error)) return ''

  const response = error.response
  const data = isRecord(response) ? response.data : undefined

  if (isRecord(data)) {
    return [asString(data.message), asString(data.error)].filter(Boolean).join(' ')
  }

  if (typeof data === 'string') return data
  return asString(error.message)
}

function isPrivateAccessError(error: unknown): boolean {
  if (getErrorStatus(error) === 403) return true

  const message = getErrorMessage(error).toLowerCase()
  return message.includes('gizli') || message.includes('private') || message.includes('forbidden')
}

// ── Action Buttons (Contact / Connect) ───────────────────────────────────────

function ActionButtons({ portfolio }: { portfolio: PublicPortfolioData }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="flex gap-3">
        <Link to="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Giriş et — əlaqə saxla
        </Link>
      </div>
    )
  }

  const isStudent = user?.role === 'student'
  const isTeacher = user?.role === 'teacher'

  // Bu səhifədə qoşulmuş statusu yalnız backend datasından gəlir — dürüst göstərilir.
  if (isStudent && portfolio.isConnected) {
    return (
      <div className="flex gap-3 flex-wrap">
        <span className="flex items-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 rounded-xl text-sm font-semibold text-indigo-700">
          ✓ Qoşuldunuz
        </span>
      </div>
    )
  }

  // Connect (student) və kurs dəvəti (teacher) üçün bu kontekstdə hazır,
  // uğurla işləyə bilən backend axını yoxdur (connections endpoint mövcud deyil;
  // kurs dəvəti kurs seçimi tələb edir). Saxta success göstərmək əvəzinə
  // düymə disabled saxlanılır və dürüst neytral mesaj verilir.
  if (!isStudent && !isTeacher) return null

  const INFO_MSG = 'Bu funksiya aktivləşdirildikdə burada işləyəcək.'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={INFO_MSG}
        className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-400 cursor-not-allowed w-fit"
      >
        {isTeacher ? '📨 Kurs dəvəti göndər' : '🤝 Connect ol'}
      </button>
      <p className="text-xs text-gray-400">{INFO_MSG}</p>
    </div>
  )
}

// ── Young Public View (3-8) ───────────────────────────────────────────────────

function YoungPublicView({ portfolio }: { portfolio: PublicPortfolioData }) {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-16">
      <div className="bg-gradient-to-b from-indigo-50 to-slate-50 text-center pt-12 pb-8 px-4">
        <motion.div
          className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl text-white mb-4 shadow-lg"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          {portfolio.user.avatar ? <img src={portfolio.user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" /> : '🦸'}
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900">{portfolio.user.name}</h1>
        <p className="text-gray-500 mt-1">{portfolio.user.school ?? portfolio.user.city}</p>
        <div className="flex justify-center gap-3 mt-4 flex-wrap">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-center">
            <div className="text-2xl">⚡</div>
            <div className="text-lg font-bold text-amber-600">{portfolio.stats.totalXP.toLocaleString()}</div>
            <div className="text-xs text-amber-600/70">XP</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2 text-center">
            <div className="text-2xl">🔥</div>
            <div className="text-lg font-bold text-orange-600">{portfolio.stats.currentStreak} gün</div>
            <div className="text-xs text-orange-600/70">Streak</div>
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <ActionButtons portfolio={portfolio} />
        </div>
      </div>

      {/* Skills as world cards */}
      <div className="max-w-xl mx-auto px-4">
        <h2 className="text-lg font-bold text-center mb-4 text-gray-900">🗺️ Bacarıq Dünyaları</h2>
        {portfolio.skills.length === 0 && (
          <SectionEmpty text="Hələ bacarıq məlumatı yoxdur." />
        )}
        <div className="grid grid-cols-2 gap-4">
          {portfolio.skills.map((skill, i) => {
            const meta = SUBJECT_META[skill.subject] ?? { emoji: '📖', color: '#6366F1' }
            return (
              <motion.div key={skill.subject}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl p-5 border bg-white text-center shadow-sm"
                style={{ borderColor: `${meta.color}30` }}
              >
                <div className="text-4xl mb-2">{meta.emoji}</div>
                <p className="text-sm font-bold mb-1" style={{ color: meta.color }}>{skill.subject}</p>
                <div className="flex justify-center"><Stars count={skill.stars} size={13} /></div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="max-w-xl mx-auto px-4 mt-8">
        <h2 className="text-lg font-bold text-center mb-4 text-gray-900">🎖️ Nailiyyətlər</h2>
        {portfolio.badges.length === 0 && (
          <SectionEmpty text="Hələ mükafat əlavə edilməyib." />
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {portfolio.badges.map((badge, i) => (
            <motion.div key={badge.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
              className={`flex flex-col items-center p-3 rounded-2xl border ${RARITY_COLORS[badge.rarity]} w-24`}
            >
              <span className="text-3xl">{badge.emoji}</span>
              <span className="text-[10px] text-gray-500 mt-1 text-center">{badge.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Teen Public View (9-14) — Timeline ───────────────────────────────────────

function TimelineItem({ event, index }: { event: TimelineEvent; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const isLeft = index % 2 === 0

  const EVENT_ICONS: Record<TimelineEventType, string> = {
    course: '🎓', competition: '🏆', badge: '🎖️', milestone: '📅', level: '⬆️', mystery: '🔮',
  }

  return (
    <div ref={ref} className={`flex items-center gap-0 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -25 : 25 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.35 }}
        className={`flex-1 border rounded-2xl p-4 shadow-sm ${event.isMystery ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-xl">{event.badgeEmoji ?? EVENT_ICONS[event.type]}</span>
          <div>
            <p className="font-semibold text-sm text-gray-900">{event.title}</p>
            {event.subtitle && <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>}
            {event.rank && (
              <span className="text-xs font-bold" style={{ color: event.rank === 1 ? '#D97706' : '#64748B' }}>
                {event.rank <= 3 ? ['🥇 1-ci', '🥈 2-ci', '🥉 3-cü'][event.rank - 1] : `#${event.rank}`}
              </span>
            )}
            <p className="text-xs text-gray-400 mt-1">{fmtDate(event.date)}</p>
          </div>
        </div>
      </motion.div>
      <div className="relative w-12 flex justify-center">
        <motion.div
          initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}}
          className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white shadow z-10"
        />
      </div>
      <div className="flex-1" />
    </div>
  )
}

function TeenPublicView({ portfolio }: { portfolio: PublicPortfolioData }) {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-16">
      <div className="bg-gradient-to-b from-indigo-50 to-slate-50 pt-8 pb-6 px-4 text-center">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl text-white mb-3 shadow-md">
          {portfolio.user.name[0]}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{portfolio.user.name}</h1>
        <p className="text-gray-500 text-sm">{portfolio.user.school ?? portfolio.user.city} · Səviyyə {portfolio.user.level}</p>
        <div className="flex justify-center gap-3 mt-3 flex-wrap">
          {[['⚡', portfolio.stats.totalXP.toLocaleString(), 'XP'], ['🔥', `${portfolio.stats.currentStreak} gün`, 'Streak'], ['✅', portfolio.stats.totalQuestions.toString(), 'Sual']].map(([icon, v, l]) => (
            <div key={l} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-center shadow-sm">
              <p className="text-base">{icon}</p>
              <p className="font-bold text-sm text-gray-900">{v}</p>
              <p className="text-xs text-gray-400">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <ActionButtons portfolio={portfolio} />
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl mx-auto px-4 relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />
        <div className="space-y-4 relative">
          {portfolio.timeline.length === 0 && (
            <SectionEmpty text="Hələ portfolio hadisəsi yoxdur." />
          )}
          {portfolio.timeline.map((ev, i) => (
            <TimelineItem key={ev.id} event={ev} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Adult Public View (15+) ───────────────────────────────────────────────────

function AdultPublicView({ portfolio }: { portfolio: PublicPortfolioData }) {
  const chartData = portfolio.competitions.map(c => ({ name: c.title.slice(0, 12), xal: c.score })).reverse()

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile header */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 -mt-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-white flex items-center justify-center text-3xl font-bold text-white shadow-xl shrink-0 relative">
                  {portfolio.user.avatar ? <img src={portfolio.user.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : portfolio.user.name[0]}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white bg-white shadow text-xs flex items-center justify-center"
                    style={{ color: LEAGUE_COLORS[portfolio.user.league] }}>
                    {portfolio.user.league === 'gold' ? '🥇' : portfolio.user.league === 'diamond' ? '💎' : '🥈'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{portfolio.user.name}</h1>
                    <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">✓ Verified</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">{portfolio.user.school ?? portfolio.user.city}</p>
                  {portfolio.user.bio && <p className="text-gray-600 text-sm mt-2 max-w-lg">{portfolio.user.bio}</p>}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap mt-2 sm:mt-0">
                <ActionButtons portfolio={portfolio} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Ümumi XP', value: portfolio.stats.totalXP.toLocaleString(), color: 'text-amber-600' },
            { label: 'Dəqiqlik', value: `${portfolio.stats.accuracy}%`, color: 'text-emerald-600' },
            { label: 'Streak rekoru', value: `${portfolio.stats.longestStreak} gün`, color: 'text-orange-600' },
            { label: 'Milli reyting', value: `#${portfolio.stats.rank}`, color: 'text-indigo-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold mb-4 text-gray-900">Bacarıqlar</h2>
          <div className="space-y-3">
            {portfolio.skills.filter(s => !s.isWeak).length === 0 && (
              <SectionEmpty text="Hələ bacarıq məlumatı yoxdur." />
            )}
            {portfolio.skills.filter(s => !s.isWeak).map(s => {
              const meta = SUBJECT_META[s.subject] ?? { emoji: '📖', color: '#6366F1' }
              return (
                <div key={s.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{meta.emoji} <span className="font-medium">{s.subject}</span></span>
                      {s.isVerified && <span className="text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Təsdiqlənib</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars count={s.stars} size={12} />
                      <span className="text-xs text-gray-400">{s.accuracy}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: meta.color }}
                      initial={{ width: 0 }} animate={{ width: `${s.level}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Badges */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-4 text-gray-900">Nişanlar</h2>
            <div className="flex flex-wrap gap-3">
              {portfolio.badges.length === 0 && (
                <SectionEmpty text="Hələ mükafat əlavə edilməyib." />
              )}
              {portfolio.badges.map((badge, i) => (
                <motion.div key={badge.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${RARITY_COLORS[badge.rarity]}`}
                  title={badge.description}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{badge.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{badge.rarity}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Certificates */}
          {portfolio.certificates.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-4 text-gray-900">Sertifikatlar</h2>
              <div className="space-y-3">
                {portfolio.certificates.map(cert => (
                  <div key={cert.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-lg shrink-0">🎓</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{cert.courseName}</p>
                      <p className="text-xs text-gray-400">{cert.teacherName} · {fmtDate(cert.issuedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Competition chart */}
        {portfolio.competitions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-4 text-gray-900">Yarış Nəticələri</h2>
            <div className="space-y-3 mb-5">
              {portfolio.competitions.map(comp => (
                <div key={comp.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl">
                  <div className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center shrink-0 ${comp.rank === 1 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                    {comp.rank <= 3 ? ['🥇', '🥈', '🥉'][comp.rank - 1] : `#${comp.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{comp.title}</p>
                    <p className="text-xs text-gray-400">{comp.totalParticipants} iştirakçı · {fmtDate(comp.date)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600 shrink-0">{comp.score} xal</span>
                </div>
              ))}
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#111827' }} />
                  <Line type="monotone" dataKey="xal" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-gray-400">
          LogiCora — Azərbaycanın təhsil super-platforması · <a href="https://logicora.az" className="hover:text-gray-600">logicora.az</a>
        </div>
      </div>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export default function PublicPortfolio() {
  const { link } = useParams<{ link: string }>()

  const { data: portfolio, isLoading, isError, error } = useQuery<PublicPortfolioData | null, unknown>({
    queryKey: ['public-portfolio', link],
    queryFn: () =>
      api.get(API_ROUTES.PORTFOLIO.BY_LINK(link!))
        .then(r => {
          const data = r.data.data as PublicPortfolioData | null
          if (data) setMetaTags(data)
          return data
        }),
    enabled: !!link,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse mx-auto" />
          <div className="h-4 bg-slate-200 rounded-xl w-36 mx-auto animate-pulse" />
          <div className="h-3 bg-slate-200 rounded-xl w-24 mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError && isPrivateAccessError(error)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center px-4">
        <div className="space-y-4 max-w-sm">
          <div className="text-7xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">Bu portfolio gizlidir</h1>
          <p className="text-gray-500">Bu profili yalnız sahibi, valideyni, əlaqəli müəllimi və ya admin görə bilər.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Ana səhifəyə qayıt
          </Link>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center px-4">
        <div className="space-y-4">
          <div className="text-7xl">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio mövcud deyil</h1>
          <p className="text-gray-500">Bu portfolio mövcud deyil və ya paylaşım aktiv deyil.</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Ana səhifəyə qayıt
          </Link>
        </div>
      </div>
    )
  }

  const ag = portfolio.user.ageGroup
  if (isYoung(ag)) return <YoungPublicView portfolio={portfolio} />
  if (isTeen(ag)) return <TeenPublicView portfolio={portfolio} />
  return <AdultPublicView portfolio={portfolio} />
}
