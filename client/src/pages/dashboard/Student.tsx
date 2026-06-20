import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Gem,
  MessageSquare,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RootState } from '../../app/store'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type {
  Course,
  DailyStatusResponse,
  GamificationProfile,
  MysteryCurrentResponse,
  Notification as AppNotification,
} from '../../types'

type LeagueTier = GamificationProfile['leagueTier']

interface ActiveCompetition {
  id: string
  title: string
  status: 'waiting' | 'active' | 'finished' | string
  playerCount: number
}

interface ClanLeaderboardRow {
  _id: string
  name: string
  slug: string
  schoolName?: string
  totalXP: number
  weeklyXP: number
  members?: unknown[]
}

interface EloRating {
  _id: string
  subject: string
  rating: number
  wins: number
  losses: number
  draws: number
}

const COMPETITION_JOIN_PATH = '/competition'

const fallbackGamification: GamificationProfile = {
  _id: 'fallback',
  studentId: 'fallback',
  totalXP: 0,
  level: 1,
  streak: 0,
  lastActivityDate: null,
  weeklyXP: 0,
  leagueTier: 'bronze',
  badges: [],
  hearts: 5,
  gems: 0,
}

const fallbackDaily: DailyStatusResponse = {
  completed: false,
  answeredCount: 0,
  totalCount: 5,
  streak: 0,
  xpEarned: 0,
}

const leagueLabel: Record<LeagueTier, string> = {
  bronze: 'Bürünc Liqa',
  silver: 'Gümüş Liqa',
  gold: 'Qızıl Liqa',
  platinum: 'Platin Liqa',
  diamond: 'Brilyant Liqa',
}

const leagueClass: Record<LeagueTier, string> = {
  bronze: 'text-orange-700 border-orange-200 bg-orange-50',
  silver: 'text-slate-600 border-slate-300 bg-slate-100',
  gold: 'text-amber-600 border-amber-200 bg-amber-50',
  platinum: 'text-sky-700 border-sky-200 bg-sky-50',
  diamond: 'text-violet-700 border-violet-200 bg-violet-50',
}

// ── Status tier — REAL totalXP-dən (Navbar ilə eyni eşik) ───────────────────

interface Tier { name: string; min: number; color: string }

const TIERS: Tier[] = [
  { name: 'Bürünc', min: 0, color: '#B45309' },
  { name: 'Gümüş', min: 1000, color: '#64748B' },
  { name: 'Qızıl', min: 5000, color: '#D97706' },
  { name: 'Platin', min: 15000, color: '#0EA5E9' },
  { name: 'Almaz', min: 50000, color: '#7C3AED' },
]

function getTier(totalXP: number) {
  let index = 0
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalXP >= TIERS[i].min) { index = i; break }
  }
  const current = TIERS[index]
  const next = TIERS[index + 1] ?? null
  const progress = next
    ? Math.max(0, Math.min(100, ((totalXP - current.min) / (next.min - current.min)) * 100))
    : 100
  const toNext = next ? Math.max(0, next.min - totalXP) : 0
  return { current, next, progress, toNext }
}

// ── Focus card accent zones ─────────────────────────────────────────────────

interface FocusAccent { card: string; chip: string; meta: string; cta: string }
const FOCUS_ACCENTS: Record<'emerald' | 'amber' | 'violet', FocusAccent> = {
  emerald: {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-300',
    chip: 'bg-emerald-100 text-emerald-700', meta: 'text-emerald-700', cta: 'text-emerald-700',
  },
  amber: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-300',
    chip: 'bg-amber-100 text-amber-700', meta: 'text-amber-700', cta: 'text-amber-700',
  },
  violet: {
    card: 'border-violet-200 bg-gradient-to-br from-violet-50 to-white hover:border-violet-300',
    chip: 'bg-violet-100 text-violet-700', meta: 'text-violet-700', cta: 'text-violet-700',
  },
}

// ── Reusable light stillər ──────────────────────────────────────────────────

const OUTLINE_BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const CARD = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'

const panelMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

const motionTransition = { duration: 0.28, ease: 'easeOut' as const }

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('az-AZ').format(value)
}

function getXpState(profile: GamificationProfile) {
  const xpPerLevel = Math.max(profile.level * 200, 200)
  const xpInLevel = profile.totalXP % xpPerLevel
  const xpPercent = clampPercent((xpInLevel / xpPerLevel) * 100)
  const xpToNext = xpPerLevel - xpInLevel

  return { xpPerLevel, xpInLevel, xpPercent, xpToNext }
}

function courseLevelLabel(level: Course['level']) {
  const labels: Record<Course['level'], string> = {
    beginner: 'Başlanğıc',
    intermediate: 'Orta',
    advanced: 'İrəli',
  }
  return labels[level]
}

function subjectLabel(subject: string) {
  const labels: Record<string, string> = {
    general: 'Ümumi',
    mathematics: 'Riyaziyyat',
    logic: 'Məntiq',
    science: 'Elm',
    language: 'Dil',
  }
  return labels[subject] ?? subject
}

function sectionTitle(title: string, subtitle?: string) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}

function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-xl border border-gray-200 bg-slate-100"
        />
      ))}
    </div>
  )
}

function QueryErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`${OUTLINE_BTN} mt-3`}
      >
        Yenidən yoxla
      </button>
    </div>
  )
}

// ── Hero status card (gradient hero-nun içində, ağ/şəffaf) ──────────────────

function HeroStatusCard({
  profile,
  tier,
  isLoading,
  isError,
  onRetry,
}: {
  profile: GamificationProfile
  tier: ReturnType<typeof getTier>
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  if (isError) {
    return (
      <div className="rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur">
        <p className="text-sm font-bold text-white">Status məlumatı yüklənmədi.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
        >
          Yenidən yoxla
        </button>
      </div>
    )
  }

  const chips = [
    { icon: Flame, label: 'Seriya', value: `${profile.streak} gün` },
    { icon: Gem, label: 'Kristal', value: formatNumber(profile.gems) },
    { icon: Zap, label: 'Həftəlik', value: formatNumber(profile.weeklyXP) },
  ]

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white" />
          <span className="text-sm font-bold text-white">{tier.current.name} status</span>
        </div>
        <span className="text-xs text-indigo-100">{isLoading ? 'Yenilənir…' : `Səviyyə ${profile.level}`}</span>
      </div>

      <p className="mt-3 text-3xl font-black tabular-nums text-white">
        {formatNumber(profile.totalXP)} <span className="text-base font-bold text-indigo-200">XP</span>
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full rounded-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${tier.progress}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-indigo-100">
        <span>{tier.current.name}</span>
        <span>{tier.next ? `${formatNumber(tier.toNext)} XP → ${tier.next.name}` : 'Maksimal tier'}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {chips.map((c) => (
          <div key={c.label} className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-2">
            <div className="flex items-center gap-1 text-indigo-100">
              <c.icon className="h-3 w-3" aria-hidden="true" />
              <p className="text-[10px]">{c.label}</p>
            </div>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-white">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero({
  firstName,
  daily,
  profile,
  tier,
  isGamificationLoading,
  isGamificationError,
  isDailyError,
  onRetryGamification,
}: {
  firstName: string
  daily: DailyStatusResponse
  profile: GamificationProfile
  tier: ReturnType<typeof getTier>
  isGamificationLoading: boolean
  isGamificationError: boolean
  isDailyError: boolean
  onRetryGamification: () => void
}) {
  const navigate = useNavigate()
  const remaining = Math.max(0, daily.totalCount - daily.answeredCount)
  const focusMessage = isDailyError
    ? 'Gündəlik tapşırıq yüklənmədi. Aşağıdakı kartdan yenidən yoxla.'
    : isGamificationError
      ? 'Bu gün üçün öyrənmə xəttini gücləndir və irəliləyişini izlə.'
      : remaining > 0
        ? `${remaining} gündəlik tapşırıq qalır. Davam et və ardıcıllığını qoru.`
        : 'Bugünkü suallar tamamlandı. İndi inkişafına və klan xəttinə bax.'
  const dailyCtaLabel = daily.completed
    ? 'Nəticəyə bax'
    : daily.answeredCount > 0 ? 'Davam et' : 'Bugünkü quizə başla'

  return (
    <motion.section
      variants={panelMotion}
      transition={motionTransition}
      className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20 sm:p-8"
      style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        aria-hidden="true"
      />

      <div className="relative grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left — greeting + CTA */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Bugünkü plan</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Salam, {firstName} 👋</h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-indigo-100 sm:text-base">{focusMessage}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.DAILY)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
            >
              {dailyCtaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.COURSES)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Kurslara bax
            </button>
          </div>
        </div>

        {/* Right — status card */}
        <HeroStatusCard
          profile={profile}
          tier={tier}
          isLoading={isGamificationLoading}
          isError={isGamificationError}
          onRetry={onRetryGamification}
        />
      </div>
    </motion.section>
  )
}

// ── Focus card (accent zoned, clickable) ────────────────────────────────────

function FocusCard({
  icon: Icon,
  title,
  description,
  meta,
  cta,
  onClick,
  accent,
}: {
  icon: LucideIcon
  title: string
  description: string
  meta: string
  cta: string
  onClick: () => void
  accent: keyof typeof FOCUS_ACCENTS
}) {
  const a = FOCUS_ACCENTS[accent]
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group flex h-full min-h-[184px] flex-col justify-between rounded-2xl border ${a.card} p-5 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-xl p-2.5 ${a.chip}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className={`text-xs font-semibold ${a.meta}`}>{meta}</span>
        </div>
        <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-gray-600">{description}</p>
      </div>
      <div className={`mt-4 flex items-center gap-2 text-sm font-bold ${a.cta}`}>
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </motion.button>
  )
}

// ── Main focus (3 distinct accent cards) ────────────────────────────────────

function MainFocus({
  daily,
  competition,
  mystery,
  isDailyError,
  onRetryDaily,
}: {
  daily: DailyStatusResponse
  competition: ActiveCompetition | null
  mystery: MysteryCurrentResponse | undefined
  isDailyError: boolean
  onRetryDaily: () => void
}) {
  const navigate = useNavigate()
  const answeredPercent = daily.totalCount > 0
    ? clampPercent((daily.answeredCount / daily.totalCount) * 100)
    : 0

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        {sectionTitle('Bugünkü fokus', 'Bu gün ən təsirli növbəti addımların')}
        <span className="hidden text-xs font-semibold text-gray-500 sm:block">
          {isDailyError
            ? 'Gündəlik tapşırıq yüklənmədi'
            : daily.completed ? 'Gündəlik tapşırıq tamamlandı' : `${daily.totalCount - daily.answeredCount} sual qalır`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily quiz — emerald zone */}
        {isDailyError ? (
          <QueryErrorState message="Gündəlik tapşırıq yüklənmədi." onRetry={onRetryDaily} />
        ) : (
          <div className="flex h-full min-h-[184px] flex-col justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-emerald-700">+{daily.xpEarned} XP</span>
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">Gündəlik suallar</h3>
              <p className="mt-2 text-sm font-medium text-gray-600">
                {daily.completed
                  ? 'Bugünkü suallar tamamlandı. Seriya xətti qorundu.'
                  : `${daily.answeredCount}/${daily.totalCount} sual tamamlanıb.`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${answeredPercent}%` }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.DAILY)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              {daily.completed ? 'Nəticəyə bax' : 'Davam et'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Competition — amber zone */}
        <FocusCard
          icon={Swords}
          title={competition ? competition.title : 'Yarış zalı'}
          description={competition
            ? `${competition.playerCount} iştirakçı hazırdır. Lobby-ə qoşul və tempini yoxla.`
            : 'Aktiv yarış yoxdur. Növbəti çağırışı gözlə və ya yarış PIN-i ilə qoşul.'}
          meta={competition?.status === 'active' ? 'Canlı' : 'Hazırlıq'}
          cta={competition ? 'Lobby-ə keç' : 'Yarışa qoşul'}
          onClick={() => navigate(competition ? APP_ROUTES.COMPETITION.LOBBY(competition.id) : COMPETITION_JOIN_PATH)}
          accent="amber"
        />

        {/* Weekly mystery — violet zone */}
        <FocusCard
          icon={Brain}
          title="Həftənin sirri"
          description={mystery?.status === 'active'
            ? 'Yeni sirr aktivdir. Çətin tapşırıq üçün sakit fokus seç.'
            : mystery?.status === 'solved'
              ? 'Bu həftənin sirri artıq həll olunub. Nəticəni analiz et.'
              : 'Növbəti sirr açılana qədər gündəlik sual və kurs xəttini gücləndir.'}
          meta={mystery?.status === 'active' ? 'Aktiv' : 'Gözləmə'}
          cta="Sirrə bax"
          onClick={() => navigate(APP_ROUTES.WEEKLY_MYSTERY)}
          accent="violet"
        />
      </div>
    </motion.section>
  )
}

// ── Support insights (kiçik, köməkçi) ───────────────────────────────────────

function SupportInsights({
  profile,
  daily,
  isGamificationError,
  isDailyError,
  onRetryGamification,
  onRetryDaily,
}: {
  profile: GamificationProfile
  daily: DailyStatusResponse
  isGamificationError: boolean
  isDailyError: boolean
  onRetryGamification: () => void
  onRetryDaily: () => void
}) {
  const remaining = Math.max(0, daily.totalCount - daily.answeredCount)
  const insights = [
    {
      icon: CheckCircle2,
      label: 'Bugünkü qərar',
      text: isDailyError
        ? 'Gündəlik tapşırıq yüklənmədi.'
        : remaining > 0 ? `${remaining} sual tamamla və seriyanı bağla.` : 'Gündəlik tapşırıq tamamlandı.',
      tone: 'text-emerald-600',
      onRetry: isDailyError ? onRetryDaily : undefined,
    },
    {
      icon: Clock,
      label: 'Temp',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${formatNumber(profile.weeklyXP)} XP bu həftə yazılıb.`,
      tone: 'text-sky-600',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
    {
      icon: Trophy,
      label: 'Rank',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${leagueLabel[profile.leagueTier]} xəttindəsən.`,
      tone: 'text-amber-600',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
  ]

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="grid gap-3 sm:grid-cols-3">
      {insights.map((insight) => (
        <div key={insight.label} className="rounded-xl border border-gray-200 bg-white/70 p-3.5">
          <div className="flex items-center gap-2">
            <insight.icon className={`h-4 w-4 ${insight.tone}`} aria-hidden="true" />
            <p className="text-xs font-semibold text-gray-500">{insight.label}</p>
          </div>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-gray-800">{insight.text}</p>
          {insight.onRetry && (
            <button
              type="button"
              onClick={insight.onRetry}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Yenidən yoxla
            </button>
          )}
        </div>
      ))}
    </motion.section>
  )
}

// ── Course preview ──────────────────────────────────────────────────────────

function CoursePreview({ course }: { course: Course | null }) {
  const navigate = useNavigate()

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Kurs önizləməsi', 'Dərs xətti')}
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {course ? (
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-base font-bold text-gray-900">{course.title}</p>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-gray-600">
            {course.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">{courseLevelLabel(course.level)}</span>
            <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">{course.totalEnrolled} tələbə</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.COURSE(course._id))}
            className={`${OUTLINE_BTN} mt-4 w-full`}
          >
            Dərslərə bax
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-gray-900">Hələ aktiv kurs yoxdur.</p>
          <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
            Kitabxanadan uyğun mövzu seçib irəliləyişini başlada bilərsən.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.COURSES)}
            className={`${OUTLINE_BTN} mt-4 w-full`}
          >
            Kurslara bax
          </button>
        </div>
      )}
    </motion.section>
  )
}

// ── Quick actions (kompakt, aşağı prioritet) ────────────────────────────────

function QuickActions({ showKids }: { showKids: boolean }) {
  const navigate = useNavigate()
  const actions: Array<{ title: string; icon: LucideIcon; path: string; tone: string }> = [
    { title: 'Yarış', icon: Swords, path: COMPETITION_JOIN_PATH, tone: 'text-amber-600' },
    { title: 'Dərslər', icon: BookOpen, path: APP_ROUTES.COURSES, tone: 'text-teal-600' },
    { title: 'Nəticələrim', icon: CheckCircle2, path: APP_ROUTES.RESULTS, tone: 'text-emerald-600' },
    { title: 'Portfolio', icon: Trophy, path: APP_ROUTES.PORTFOLIO_ME, tone: 'text-violet-600' },
    { title: 'Klan', icon: Shield, path: APP_ROUTES.CLAN_LEADERBOARD, tone: 'text-indigo-600' },
    ...(showKids
      ? [{ title: 'Uşaq Klubu', icon: Sparkles, path: APP_ROUTES.KIDS_HUB, tone: 'text-sky-600' }]
      : []),
  ]

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="space-y-3">
      {sectionTitle('Sürətli keçidlər')}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {actions.map((action) => (
          <motion.button
            key={action.title}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 ${action.tone}`}>
              <action.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-gray-900">{action.title}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}

// ── Progress panel (ayrıca sky zona) ────────────────────────────────────────

function ProgressPanel({
  profile,
  elo,
  leaderboardRank,
  isGamificationError,
  onRetryGamification,
}: {
  profile: GamificationProfile
  elo: EloRating[]
  leaderboardRank: number | null
  isGamificationError: boolean
  onRetryGamification: () => void
}) {
  const xp = getXpState(profile)
  const bestElo = elo.length > 0
    ? [...elo].sort((a, b) => b.rating - a.rating)[0]
    : null

  return (
    <motion.section
      variants={panelMotion}
      transition={motionTransition}
      className="space-y-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('İrəliləyiş', 'Sənin statistikan')}
        {!isGamificationError && <TrendingBadge tier={profile.leagueTier} />}
      </div>

      {isGamificationError ? (
        <QueryErrorState message="Gamifikasiya məlumatları yüklənmədi." onRetry={onRetryGamification} />
      ) : (
        <>
          <div className="rounded-xl border border-sky-100 bg-white p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Ümumi XP</p>
                <p className="text-3xl font-black tabular-nums text-gray-900">{formatNumber(profile.totalXP)}</p>
              </div>
              <p className="text-sm font-bold text-sky-600">{Math.round(xp.xpPercent)}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${xp.xpPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DataTile label="ELO" value={bestElo ? String(bestElo.rating) : '1200'} detail={bestElo ? subjectLabel(bestElo.subject) : 'Ümumi'} />
            <DataTile label="Liqadakı mövqe" value={leaderboardRank ? `#${leaderboardRank}` : 'İlk 100'} detail={leaderboardRank ? 'Milli sıralama' : 'Hədəf xətti'} />
            <DataTile label="Həftəlik XP" value={formatNumber(profile.weeklyXP)} detail="Bu həftə" />
            <DataTile label="Nişanlar" value={String(profile.badges.length)} detail="Açılmış" />
          </div>
        </>
      )}
    </motion.section>
  )
}

function TrendingBadge({ tier }: { tier: LeagueTier }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${leagueClass[tier]}`}>
      {leagueLabel[tier]}
    </span>
  )
}

function DataTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{detail}</p>
    </div>
  )
}

// ── Clan & league panel ─────────────────────────────────────────────────────

function ClanLeaguePanel({ clans }: { clans: ClanLeaderboardRow[] }) {
  const navigate = useNavigate()
  const topClan = clans[0] ?? null

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Klan və liqa', 'Komanda mövqeyi')}
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Users className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {topClan ? (
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN(topClan.slug))}
          className="group block w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">{topClan.name}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {topClan.schoolName || 'Açıq sıralama'}
              </p>
            </div>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-600">
              #1
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DataTile label="Toplam XP" value={formatNumber(topClan.totalXP)} detail="Klan gücü" />
            <DataTile label="Həftəlik XP" value={formatNumber(topClan.weeklyXP)} detail="Temp" />
          </div>
          <span className="mt-4 flex items-center gap-2 text-sm font-bold text-violet-700">
            Klan səhifəsinə bax
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-gray-900">Klan sıralaması boşdur</p>
          <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
            Klana qoşulmamısan. Komanda ilə XP qazanmaq üçün sıralamanı yoxla və uyğun klan seç.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN('me'))}
          className={`${OUTLINE_BTN} w-full`}
        >
          Mənim klanım
        </button>
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)}
          className={`${OUTLINE_BTN} w-full`}
        >
          Tam sıralama
        </button>
      </div>
    </motion.section>
  )
}

// ── Social feed panel ───────────────────────────────────────────────────────

function SocialFeedPanel({
  notifications,
  isLoading,
}: {
  notifications: AppNotification[]
  isLoading: boolean
}) {
  return (
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Aktivlik lenti', 'Son siqnallar')}
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {isLoading ? (
        <LoadingBlock lines={3} />
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.slice(0, 4).map((item) => (
            <div key={item._id} className="rounded-xl border border-gray-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-gray-500">
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-gray-900">Bu gün üçün yeni bildiriş yoxdur.</p>
          <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
            Gündəlik tapşırıq, yarış və klan nəticələri burada kompakt şəkildə görünəcək.
          </p>
        </div>
      )}
    </motion.section>
  )
}

function useDashboardQueries() {
  const gamification = useQuery<GamificationProfile>({
    queryKey: ['dashboard', 'gamification', 'me'],
    queryFn: () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then((r) => r.data.data),
    staleTime: 1000 * 60 * 2,
  })

  const daily = useQuery<DailyStatusResponse>({
    queryKey: ['dashboard', 'daily', 'status'],
    queryFn: () => api.get<{ data: DailyStatusResponse }>(API_ROUTES.DAILY.STATUS).then((r) => r.data.data),
    staleTime: 1000 * 60,
  })

  const competitions = useQuery<ActiveCompetition | null>({
    queryKey: ['dashboard', 'competitions', 'active'],
    queryFn: () =>
      api.get<{ data: Array<Record<string, unknown>> }>(API_ROUTES.COMPETITIONS.ACTIVE).then((r) => {
        const list = r.data.data ?? []
        const item = list[0] as
          | { _id?: string; title?: string; status?: string; participants?: unknown[] }
          | undefined

        if (!item?._id) return null

        return {
          id: item._id,
          title: item.title || 'Aktiv yarış',
          status: item.status || 'waiting',
          playerCount: item.participants?.length ?? 0,
        }
      }),
    staleTime: 1000 * 30,
  })

  const mystery = useQuery<MysteryCurrentResponse>({
    queryKey: ['dashboard', 'weekly-mystery', 'current'],
    queryFn: () => api.get<{ data: MysteryCurrentResponse }>(API_ROUTES.MYSTERY.CURRENT).then((r) => r.data.data),
    staleTime: 1000 * 60,
  })

  const clans = useQuery<ClanLeaderboardRow[]>({
    queryKey: ['dashboard', 'clans', 'leaderboard'],
    queryFn: () => api.get<{ data: ClanLeaderboardRow[] }>(API_ROUTES.CLANS.LEADERBOARD).then((r) => r.data.data),
    staleTime: 1000 * 60 * 3,
  })

  const elo = useQuery<EloRating[]>({
    queryKey: ['dashboard', 'elo', 'me'],
    queryFn: () => api.get<{ data: EloRating[] }>(API_ROUTES.ELO.ME).then((r) => r.data.data),
    staleTime: 1000 * 60 * 3,
  })

  const notifications = useQuery<AppNotification[]>({
    queryKey: ['dashboard', 'notifications', 'list'],
    queryFn: () => api.get<{ data: AppNotification[] }>(API_ROUTES.NOTIFICATIONS.LIST).then((r) => r.data.data),
    staleTime: 1000 * 60,
  })

  const courses = useQuery<Course[]>({
    queryKey: ['dashboard', 'courses', 'preview'],
    queryFn: () => api.get<{ data: Course[] }>(API_ROUTES.COURSES.LIST).then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  })

  const leaderboard = useQuery<Array<{ studentId?: string; totalXP?: number }>>({
    queryKey: ['dashboard', 'gamification', 'leaderboard'],
    queryFn: () =>
      api.get<{ data: Array<{ studentId?: string | { _id?: string }; totalXP?: number }> }>(
        API_ROUTES.GAMIFICATION.LEADERBOARD_NATIONAL
      ).then((r) =>
        (r.data.data ?? []).map((row) => ({
          studentId: typeof row.studentId === 'string' ? row.studentId : row.studentId?._id,
          totalXP: row.totalXP,
        }))
      ),
    staleTime: 1000 * 60 * 2,
  })

  return { gamification, daily, competitions, mystery, clans, elo, notifications, courses, leaderboard }
}

export default function StudentDashboard() {
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser
  const queries = useDashboardQueries()

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-color', avatarColor)
    return () => {
      document.documentElement.style.removeProperty('--avatar-color')
    }
  }, [avatarColor])

  const isGamificationError = queries.gamification.isError && !queries.gamification.data
  const isDailyError = queries.daily.isError && !queries.daily.data
  const retryGamification = () => { void queries.gamification.refetch() }
  const retryDaily = () => { void queries.daily.refetch() }
  const profile = queries.gamification.data ?? fallbackGamification
  const daily = queries.daily.data ?? fallbackDaily
  const competition = queries.competitions.data ?? null
  const clans = queries.clans.data ?? []
  const elo = queries.elo.data ?? []
  const notifications = queries.notifications.data ?? []
  const course = queries.courses.data?.[0] ?? null
  const firstName = user?.name || 'Tələbə'
  const ageGroup = (user as { ageGroup?: string } | null)?.ageGroup ?? ''
  const showKids = ['3-5', '6-8'].includes(ageGroup)

  const rankIndex = user?._id
    ? (queries.leaderboard.data ?? []).findIndex((row) => row.studentId === user._id)
    : -1
  const leaderboardRank = rankIndex >= 0 ? rankIndex + 1 : null

  const tier = getTier(profile.totalXP)

  return (
    <div
      className="min-h-[calc(100vh-72px)] px-4 py-6 text-gray-900 lg:px-8 lg:py-8"
      style={{ background: 'linear-gradient(180deg, #EEF2FF 0px, #F8FAFC 260px)' }}
    >
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.06 }}
        className="mx-auto max-w-screen-2xl space-y-6 lg:space-y-8"
      >
        <Hero
          firstName={firstName}
          daily={daily}
          profile={profile}
          tier={tier}
          isGamificationLoading={queries.gamification.isLoading}
          isGamificationError={isGamificationError}
          isDailyError={isDailyError}
          onRetryGamification={retryGamification}
        />

        <MainFocus
          daily={daily}
          competition={competition}
          mystery={queries.mystery.data}
          isDailyError={isDailyError}
          onRetryDaily={retryDaily}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <SupportInsights
              profile={profile}
              daily={daily}
              isGamificationError={isGamificationError}
              isDailyError={isDailyError}
              onRetryGamification={retryGamification}
              onRetryDaily={retryDaily}
            />
            <CoursePreview course={course} />
            <QuickActions showKids={showKids} />
          </main>

          <aside className="space-y-6 lg:sticky lg:top-[88px] lg:self-start">
            <ProgressPanel
              profile={profile}
              elo={elo}
              leaderboardRank={leaderboardRank}
              isGamificationError={isGamificationError}
              onRetryGamification={retryGamification}
            />
            <ClanLeaguePanel clans={clans} />
            <SocialFeedPanel
              notifications={notifications}
              isLoading={queries.notifications.isLoading}
            />
          </aside>
        </div>
      </motion.div>
    </div>
  )
}
