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

const leagueClass: Record<LeagueTier, string> = {
  bronze: 'text-bronze border-bronze/30 bg-bronze/10',
  silver: 'text-silver border-silver/30 bg-silver/10',
  gold: 'text-gold border-gold/30 bg-gold/10',
  platinum: 'text-platinum border-platinum/30 bg-platinum/10',
  diamond: 'text-diamond border-diamond/30 bg-diamond/10',
}

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
      <p className="text-xs font-semibold uppercase text-text-secondary">{eyebrow}</p>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  )
}

function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-card border border-border bg-bg-card"
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
    <div className="rounded-card border border-danger/30 bg-danger/10 p-4">
      <p className="text-sm font-bold text-white">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-outline mt-3"
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
    <div className="flex min-w-0 items-center gap-2 rounded-btn border border-border bg-bg-card px-3 py-2">
      <Icon className={`h-4 w-4 shrink-0 ${accentClass}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase text-text-secondary">{label}</p>
        <p className="truncate text-sm font-black tabular-nums text-white">{value}</p>
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
  const headerClassName = 'sticky top-16 z-20 -mx-4 border-y border-border bg-bg-primary/90 px-4 py-3 backdrop-blur-xl lg:top-16 lg:mx-0 lg:rounded-card lg:border'

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
            <p className="text-xs font-semibold uppercase text-text-secondary">Komanda mərkəzi</p>
            <p className="text-xl font-black tabular-nums text-white">Səviyyə {profile.level}</p>
          </div>
          {isLoading && (
            <span className="rounded-btn border border-border bg-bg-card px-2 py-1 text-xs text-text-secondary">
              Yenilənir
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[640px]">
          <MetricPill
            icon={Zap}
            label="XP"
            value={`${formatNumber(profile.totalXP)} XP`}
            accentClass="text-accent-green"
          />
          <MetricPill
            icon={Flame}
            label="Seriya"
            value={`${profile.streak} gün`}
            accentClass="text-accent-orange"
          />
          <MetricPill
            icon={Medal}
            label="Liqa"
            value={leagueLabel[profile.leagueTier]}
            accentClass="text-gold"
          />
          <MetricPill
            icon={Gem}
            label="Kristal"
            value={formatNumber(profile.gems)}
            accentClass="text-accent-cyan"
          />
          <MetricPill
            icon={Heart}
            label="Can"
            value={String(profile.hearts)}
            accentClass="text-danger"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Növbəti səviyyəyə irəliləyiş</span>
          <span>{formatNumber(xp.xpToNext)} XP qalır</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent-green"
            initial={{ width: 0 }}
            animate={{ width: `${xp.xpPercent}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.header>
  )
}

function CompanionGreeting({
  firstName,
  avatarColor,
  profile,
  daily,
  isGamificationError,
  isDailyError,
}: {
  firstName: string
  avatarColor: string
  profile: GamificationProfile
  daily: DailyStatusResponse
  isGamificationError: boolean
  isDailyError: boolean
}) {
  const remaining = Math.max(0, daily.totalCount - daily.answeredCount)
  const companionName = avatarColor.toLowerCase() === '#3b82f6' ? 'Logi' : 'Cora'
  const companionTone = isDailyError
    ? 'Gündəlik tapşırıq yüklənmədi. Aşağıdakı kartdan yenidən yoxla.'
    : isGamificationError
      ? 'Gamifikasiya məlumatları yüklənmədi. Yenidən yoxla ilə təkrar cəhd et.'
      : companionName === 'Logi'
        ? `${remaining} tapşırıq qalır. ${profile.weeklyXP + 40} XP həftəlik temp üçün yaxşı hədəfdir.`
        : `Bugünkü ritmin sabitdir. Gündəlik sualları tamamla, sonra portfolio və klan xəttini gücləndir.`
  const priorityText = isDailyError
    ? 'Gündəlik tapşırıq yüklənmədi.'
    : isGamificationError
      ? 'Gamifikasiya məlumatları yüklənmədi.'
      : daily.completed ? 'Seriya qorundu, indi mövqe irəliləyişinə bax.' : 'Gündəlik sualları bitir və XP xəttini qoru.'

  return (
    <motion.section
      variants={panelMotion}
      transition={motionTransition}
      className="card-glow overflow-hidden"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border bg-bg-card"
            style={{ borderColor: `${avatarColor}66`, boxShadow: `0 0 28px ${avatarColor}22` }}
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" style={{ color: avatarColor }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-text-secondary">{companionName} xətti</p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
              Salam, {firstName}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-white/75">{companionTone}</p>
          </div>
        </div>

        <div className="rounded-card border border-border bg-bg-card px-4 py-3">
          <p className="text-xs font-semibold uppercase text-text-secondary">Bugünkü prioritet</p>
          <p className="mt-1 text-sm font-bold text-white">
            {priorityText}
          </p>
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
      className="group flex h-full min-h-[172px] flex-col justify-between rounded-card border border-border bg-bg-card p-4 text-left transition-colors hover:border-white/25"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-btn border border-current/25 bg-current/10 p-2 ${accentClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-text-secondary">{meta}</span>
        </div>
        <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-white/70">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white">
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
        <span className="text-xs font-semibold text-text-secondary">
          {isDailyError
            ? 'Gündəlik tapşırıq yüklənmədi'
            : daily.completed ? 'Gündəlik tapşırıq tamamlandı' : `${daily.totalCount - daily.answeredCount} sual qalır`}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {isDailyError ? (
          <QueryErrorState message="Gündəlik tapşırıq yüklənmədi." onRetry={onRetryDaily} />
        ) : (
          <div className="rounded-card border border-border bg-bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="rounded-btn border border-accent-green/30 bg-accent-green/10 p-2 text-accent-green">
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold text-accent-green">+{daily.xpEarned} XP</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-white">Gündəlik suallar</h3>
            <p className="mt-2 text-sm font-medium text-white/70">
              {daily.completed
                ? 'Bugünkü suallar tamamlandı. Seriya xətti qorundu.'
                : `${daily.answeredCount}/${daily.totalCount} sual tamamlanıb. İndi davam etmək ən yaxşı hərəkətdir.`}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-accent-green"
                initial={{ width: 0 }}
                animate={{ width: `${answeredPercent}%` }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
            </div>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.DAILY)}
              className="btn-primary mt-4 w-full"
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
          accentClass="text-accent-orange"
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
          accentClass="text-accent-purple"
        />
      </div>
    </motion.section>
  )
}

function QuickActions() {
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
      tone: 'text-accent-orange',
    },
    {
      title: 'Dərslər',
      caption: 'Kurs kitabxanası',
      icon: BookOpen,
      path: APP_ROUTES.COURSES,
      tone: 'text-accent-cyan',
    },
    {
      title: 'Portfolio',
      caption: 'Nailiyyət vitrini',
      icon: Trophy,
      path: APP_ROUTES.PORTFOLIO_ME,
      tone: 'text-accent-purple',
    },
    {
      title: 'Klan',
      caption: 'Komanda sıralaması',
      icon: Shield,
      path: APP_ROUTES.CLAN_LEADERBOARD,
      tone: 'text-accent-green',
    },
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
            className="group rounded-card border border-border bg-bg-card p-4 text-left transition-colors hover:border-white/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-btn border border-current/25 bg-current/10 p-2 ${action.tone}`}>
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowRight className="h-4 w-4 text-text-secondary transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-bold text-white">{action.title}</p>
            <p className="mt-1 text-xs font-medium text-text-secondary">{action.caption}</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}

function CoursePreview({ course }: { course: Course | null }) {
  const navigate = useNavigate()

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Kurs önizləməsi', 'Dərs xətti')}
        <BookOpen className="h-5 w-5 text-accent-cyan" aria-hidden="true" />
      </div>

      {course ? (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <p className="text-base font-bold text-white">{course.title}</p>
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/70">
            {course.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge-purple">{courseLevelLabel(course.level)}</span>
            <span className="badge-green">{course.totalEnrolled} tələbə</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.COURSE(course._id))}
            className="btn-outline mt-4 w-full"
          >
            Dərslərə bax
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <p className="text-sm font-bold text-white">Seçilmiş kurs hazır deyil</p>
          <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">
            Kurs xətti boş görünür. Kitabxanadan uyğun mövzu seçib irəliləyişini başlada bilərsən.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.COURSES)}
            className="btn-outline mt-4 w-full"
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
    <motion.section variants={panelMotion} transition={motionTransition} className="card space-y-4">
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
                <p className="text-xs font-semibold uppercase text-text-secondary">Ümumi XP</p>
                <p className="text-3xl font-black tabular-nums text-white">{formatNumber(profile.totalXP)}</p>
              </div>
              <p className="text-sm font-bold text-accent-green">{Math.round(xp.xpPercent)}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent-green" style={{ width: `${xp.xpPercent}%` }} />
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
    <span className={`rounded-btn border px-2 py-1 text-xs font-bold ${leagueClass[tier]}`}>
      {leagueLabel[tier]}
    </span>
  )
}

function DataTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-card border border-border bg-bg-card p-3">
      <p className="text-[10px] font-semibold uppercase text-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-text-secondary">{detail}</p>
    </div>
  )
}

function ClanLeaguePanel({ clans }: { clans: ClanLeaderboardRow[] }) {
  const navigate = useNavigate()
  const topClan = clans[0] ?? null

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Klan və liqa', 'Rəqiblər nə edir?')}
        <Users className="h-5 w-5 text-accent-purple" aria-hidden="true" />
      </div>

      {topClan ? (
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN(topClan.slug))}
          className="group block w-full rounded-card border border-border bg-bg-card p-4 text-left transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">{topClan.name}</p>
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {topClan.schoolName || 'Açıq sıralama'}
              </p>
            </div>
            <span className="rounded-btn border border-gold/30 bg-gold/10 px-2 py-1 text-xs font-black text-gold">
              #1
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DataTile label="Toplam XP" value={formatNumber(topClan.totalXP)} detail="Klan gücü" />
            <DataTile label="Həftəlik XP" value={formatNumber(topClan.weeklyXP)} detail="Temp" />
          </div>
          <span className="mt-4 flex items-center gap-2 text-sm font-bold text-white">
            Klan səhifəsinə bax
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <p className="text-sm font-bold text-white">Klan sıralaması boşdur</p>
          <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">
            Klana qoşulmamısan. Komanda ilə XP qazanmaq üçün sıralamanı yoxla və uyğun klan seç.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN('me'))}
          className="btn-outline w-full"
        >
          Mənim klanım
        </button>
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.CLAN_LEADERBOARD)}
          className="btn-outline w-full"
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
    <motion.section variants={panelMotion} transition={motionTransition} className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        {sectionTitle('Aktivlik lenti', 'Son siqnallar')}
        <Bell className="h-5 w-5 text-accent-cyan" aria-hidden="true" />
      </div>

      {isLoading ? (
        <LoadingBlock lines={3} />
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.slice(0, 4).map((item) => (
            <div key={item._id} className="rounded-card border border-border bg-bg-card p-3">
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-text-secondary">
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-bg-card p-4">
          <p className="text-sm font-bold text-white">Hələ yeni aktivlik yoxdur</p>
          <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">
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
      tone: 'text-accent-green',
      onRetry: isDailyError ? onRetryDaily : undefined,
    },
    {
      icon: Clock,
      label: 'Temp',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${formatNumber(profile.weeklyXP)} XP həftəlik nəticə artıq yazılıb.`,
      tone: 'text-accent-cyan',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
    {
      icon: Trophy,
      label: 'Rank',
      text: isGamificationError
        ? 'Gamifikasiya məlumatları yüklənmədi.'
        : `${leagueLabel[profile.leagueTier]} xəttində mövqeyini qoruyursan.`,
      tone: 'text-gold',
      onRetry: isGamificationError ? onRetryGamification : undefined,
    },
  ]

  return (
    <motion.section variants={panelMotion} transition={motionTransition} className="grid gap-3 md:grid-cols-3">
      {insights.map((insight) => (
        <div key={insight.label} className="rounded-card border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2">
            <insight.icon className={`h-4 w-4 ${insight.tone}`} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase text-text-secondary">{insight.label}</p>
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-white">{insight.text}</p>
          {insight.onRetry && (
            <button
              type="button"
              onClick={insight.onRetry}
              className="btn-outline mt-3"
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

  const rankIndex = user?._id
    ? (queries.leaderboard.data ?? []).findIndex((row) => row.studentId === user._id)
    : -1
  const leaderboardRank = rankIndex >= 0 ? rankIndex + 1 : null

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-bg-primary px-4 py-5 text-white lg:px-8 lg:py-6">
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
        <CompanionGreeting
          firstName={firstName}
          avatarColor={avatarColor}
          profile={profile}
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
            <QuickActions />
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
