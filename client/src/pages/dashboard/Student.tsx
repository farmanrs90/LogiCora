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
  Heart,
  Medal,
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

// Light league chip stilləri (premium, az kontrastlı deyil)
const leagueClass: Record<LeagueTier, string> = {
  bronze: 'text-orange-700 border-orange-200 bg-orange-50',
  silver: 'text-slate-600 border-slate-300 bg-slate-100',
  gold: 'text-amber-600 border-amber-200 bg-amber-50',
  platinum: 'text-sky-700 border-sky-200 bg-sky-50',
  diamond: 'text-cyan-700 border-cyan-200 bg-cyan-50',
}

// Reusable light stillər (qlobal .card/.btn-* dark olduğu üçün burada inline)
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
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

function sectionTitle(title: string, eyebrow: string) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">{eyebrow}</p>
      <h2 className="text-lg font-bold tracking-tight text-gray-900">{title}</h2>
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

function MetricPill({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: LucideIcon
  label: string
  value: string
  accentClass: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase text-gray-500">{label}</p>
        <p className="truncate text-sm font-black tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function StatusHeader({
  profile,
  isLoading,
  isError,
  onRetry,
}: {
  profile: GamificationProfile
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  const xp = getXpState(profile)
  const headerClassName = 'sticky top-16 z-20 -mx-4 border-y border-gray-200 bg-slate-50/90 px-4 py-3 backdrop-blur-xl lg:top-16 lg:mx-0 lg:rounded-2xl lg:border'

  if (isError) {
    return (
      <motion.header
        variants={panelMotion}
        transition={motionTransition}
        className={headerClassName}
      >
        <QueryErrorState message="Gamifikasiya məlumatları yüklənmədi." onRetry={onRetry} />
      </motion.header>
    )
  }

  return (
    <motion.header
      variants={panelMotion}
      transition={motionTransition}
      className={headerClassName}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Komanda mərkəzi</p>
            <p className="text-xl font-black tabular-nums text-gray-900">Səviyyə {profile.level}</p>
          </div>
          {isLoading && (
            <span className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
              Yenilənir
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[640px]">
          <MetricPill
            icon={Zap}
            label="XP"
            value={`${formatNumber(profile.totalXP)} XP`}
            accentClass="text-emerald-600"
          />
          <MetricPill
            icon={Flame}
            label="Seriya"
            value={`${profile.streak} gün`}
            accentClass="text-orange-500"
          />
          <MetricPill
            icon={Medal}
            label="Liqa"
            value={leagueLabel[profile.leagueTier]}
            accentClass="text-amber-500"
          />
          <MetricPill
            icon={Gem}
            label="Kristal"
            value={formatNumber(profile.gems)}
            accentClass="text-teal-600"
          />
          <MetricPill
            icon={Heart}
            label="Can"
            value={String(profile.hearts)}
            accentClass="text-red-500"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Növbəti səviyyəyə irəliləyiş</span>
          <span>{formatNumber(xp.xpToNext)} XP qalır</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${xp.xpPercent}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.header>
  )
}

function HeroGreeting({
  firstName,
  daily,
  isGamificationError,
  isDailyError,
}: {
  firstName: string
  daily: DailyStatusResponse
  isGamificationError: boolean
  isDailyError: boolean
}) {
  const navigate = useNavigate()
  const remaining = Math.max(0, daily.totalCount - daily.answeredCount)
  const focusMessage = isDailyError
    ? 'Gündəlik tapşırıq yüklənmədi. Aşağıdakı kartdan yenidən yoxla.'
    : isGamificationError
      ? 'Gamifikasiya məlumatları yüklənmədi. Yenidən yoxla ilə təkrar cəhd et.'
      : remaining > 0
        ? `${remaining} tapşırıq qalır. Davam et və ardıcıllığını qoru.`
        : 'Bugünkü suallar tamamlandı. İndi inkişafına və klan xəttinə bax.'
  const priorityText = isDailyError
    ? 'Gündəlik tapşırıq yüklənmədi.'
    : isGamificationError
      ? 'Gamifikasiya məlumatları yüklənmədi.'
      : daily.completed ? 'Seriya qorundu, indi mövqe irəliləyişinə bax.' : 'Gündəlik sualları bitir və XP xəttini qoru.'
  const dailyCtaLabel = daily.completed
    ? 'Nəticəyə bax'
    : daily.answeredCount > 0 ? 'Davam et' : 'Bugünkü quizə başla'

  return (
    <motion.section
      variants={panelMotion}
      transition={motionTransition}
      className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Bugünkü fokus</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Salam, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-gray-600">{focusMessage}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Bugünkü prioritet</p>
            <p className="mt-1 text-sm font-bold text-gray-900">
              {priorityText}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.DAILY)}
            className={`${PRIMARY_BTN} w-full sm:w-auto`}
          >
            {dailyCtaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.section>
  )
}

function FocusCard({
  icon: Icon,
  title,
  description,
  meta,
  cta,
  onClick,
  accentClass,
}: {
  icon: LucideIcon
  title: string
  description: string
  meta: string
  cta: string
  onClick: () => void
  accentClass: string
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group flex h-full min-h-[172px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-xl border border-current/20 bg-current/10 p-2 ${accentClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-gray-500">{meta}</span>
        </div>
        <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-gray-600">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </motion.button>
  )
}

function TodaysFocus({
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
    <motion.section variants={panelMotion} transition={motionTransition} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        {sectionTitle('Bugünkü fokus', 'Nə etməliyəm?')}
        <span className="text-xs font-semibold text-gray-500">
          {isDailyError
            ? 'Gündəlik tapşırıq yüklənmədi'
            : daily.completed ? 'Gündəlik tapşırıq tamamlandı' : `${daily.totalCount - daily.answeredCount} sual qalır`}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {isDailyError ? (
          <QueryErrorState message="Gündəlik tapşırıq yüklənmədi." onRetry={onRetryDaily} />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-600">
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold text-emerald-600">+{daily.xpEarned} XP</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">Gündəlik suallar</h3>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {daily.completed
                ? 'Bugünkü suallar tamamlandı. Seriya xətti qorundu.'
                : `${daily.answeredCount}/${daily.totalCount} sual tamamlanıb. İndi davam etmək ən yaxşı hərəkətdir.`}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${answeredPercent}%` }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.DAILY)}
              className={`${PRIMARY_BTN} mt-4 w-full`}
            >
              {daily.completed ? 'Nəticəyə bax' : 'Davam et'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <FocusCard
          icon={Swords}
          title={competition ? competition.title : 'Yarış zalı'}
          description={competition
            ? `${competition.playerCount} iştirakçı hazırdır. Lobby-ə qoşul və tempini yoxla.`
            : 'Aktiv yarış yoxdur. Növbəti çağırışı gözlə və ya yarış PIN-i ilə qoşul.'}
          meta={competition?.status === 'active' ? 'Canlı' : 'Hazırlıq'}
          cta={competition ? 'Lobby-ə keç' : 'Yarışa qoşul'}
          onClick={() => navigate(competition ? APP_ROUTES.COMPETITION.LOBBY(competition.id) : COMPETITION_JOIN_PATH)}
          accentClass="text-orange-500"
        />

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
          accentClass="text-indigo-600"
        />
      </div>
    </motion.section>
  )
}

function QuickActions({ showKids }: { showKids: boolean }) {
  const navigate = useNavigate()
  const actions: Array<{
    title: string
    caption: string
    icon: LucideIcon
    path: string
    tone: string
  }> = [
    {
      title: 'Yarış',
      caption: 'PIN və ya canlı lobby',
      icon: Swords,
      path: COMPETITION_JOIN_PATH,
      tone: 'text-orange-500',
    },
    {
      title: 'Dərslər',
      caption: 'Kurs kitabxanası',
      icon: BookOpen,
      path: APP_ROUTES.COURSES,
      tone: 'text-teal-600',
    },
    {
      title: 'Portfolio',
      caption: 'Nailiyyət vitrini',
      icon: Trophy,
      path: APP_ROUTES.PORTFOLIO_ME,
      tone: 'text-indigo-600',
    },
    {
      title: 'Klan',
      caption: 'Komanda sıralaması',
      icon: Shield,
      path: APP_ROUTES.CLAN_LEADERBOARD,
      tone: 'text-emerald-600',
    },
    ...(showKids
      ? [{
          title: 'Uşaq Klubu',
          caption: 'Yaşa uyğun modul',
          icon: Sparkles,
          path: APP_ROUTES.KIDS_HUB,
          tone: 'text-amber-500',
        }]
      : []),
  ]

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="space-y-3">
      {sectionTitle('Sürətli keçidlər', 'Növbəti addım')}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <motion.button
            key={action.title}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="group rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-xl border border-current/20 bg-current/10 p-2 ${action.tone}`}>
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-bold text-gray-900">{action.title}</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{action.caption}</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}

function CoursePreview({ course }: { course: Course | null }) {
  const navigate = useNavigate()

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Kurs önizləməsi', 'Dərs xətti')}
        <BookOpen className="h-5 w-5 text-teal-600" aria-hidden="true" />
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
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('İrəliləyiş', 'Haradayam?')}
        {!isGamificationError && <TrendingBadge tier={profile.leagueTier} />}
      </div>

      {isGamificationError ? (
        <QueryErrorState message="Gamifikasiya məlumatları yüklənmədi." onRetry={onRetryGamification} />
      ) : (
        <>
          <div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Ümumi XP</p>
                <p className="text-3xl font-black tabular-nums text-gray-900">{formatNumber(profile.totalXP)}</p>
              </div>
              <p className="text-sm font-bold text-emerald-600">{Math.round(xp.xpPercent)}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${xp.xpPercent}%` }} />
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
    <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{detail}</p>
    </div>
  )
}

function ClanLeaguePanel({ clans }: { clans: ClanLeaderboardRow[] }) {
  const navigate = useNavigate()
  const topClan = clans[0] ?? null

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className={`${CARD} space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Klan və liqa', 'Rəqiblər nə edir?')}
        <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" />
      </div>

      {topClan ? (
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN(topClan.slug))}
          className="group block w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
          <span className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600">
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
        <Bell className="h-5 w-5 text-teal-600" aria-hidden="true" />
      </div>

      {isLoading ? (
        <LoadingBlock lines={3} />
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.slice(0, 4).map((item) => (
            <div key={item._id} className="rounded-xl border border-gray-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
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

function InsightStrip({
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
        : remaining > 0 ? `${remaining} sual tamamla və seriyanı bağla.` : 'Gündəlik tapşırıq tamamlandı. Növbəti hədəf liqa tempidir.',
      tone: 'text-emerald-600',
      onRetry: isDailyError ? onRetryDaily : undefined,
    },
    {
      icon: Clock,
      label: 'Temp',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${formatNumber(profile.weeklyXP)} XP həftəlik nəticə artıq yazılıb.`,
      tone: 'text-teal-600',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
    {
      icon: Trophy,
      label: 'Rank',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${leagueLabel[profile.leagueTier]} xəttində mövqeyini qoruyursan.`,
      tone: 'text-amber-500',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
  ]

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="grid gap-3 md:grid-cols-3">
      {insights.map((insight) => (
        <div key={insight.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <insight.icon className={`h-4 w-4 ${insight.tone}`} aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{insight.label}</p>
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-gray-900">{insight.text}</p>
          {insight.onRetry && (
            <button
              type="button"
              onClick={insight.onRetry}
              className={`${OUTLINE_BTN} mt-3`}
            >
              Yenidən yoxla
            </button>
          )}
        </div>
      ))}
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-5 text-gray-900 lg:px-8 lg:py-6">
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.06 }}
        className="mx-auto max-w-screen-2xl space-y-4 lg:space-y-6"
      >
        <StatusHeader
          profile={profile}
          isLoading={queries.gamification.isLoading}
          isError={isGamificationError}
          onRetry={retryGamification}
        />
        <HeroGreeting
          firstName={firstName}
          daily={daily}
          isGamificationError={isGamificationError}
          isDailyError={isDailyError}
        />
        <InsightStrip
          profile={profile}
          daily={daily}
          isGamificationError={isGamificationError}
          isDailyError={isDailyError}
          onRetryGamification={retryGamification}
          onRetryDaily={retryDaily}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-4">
            <TodaysFocus
              daily={daily}
              competition={competition}
              mystery={queries.mystery.data}
              isDailyError={isDailyError}
              onRetryDaily={retryDaily}
            />
            <QuickActions showKids={showKids} />
            <CoursePreview course={course} />
          </main>

          <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
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
