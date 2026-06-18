import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import api from '../../lib/axios'
import { API_ROUTES, APP_ROUTES } from '../../constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Skill {
  subject: string
  stars: number         // 0-5 (young)
  xp: number
  level: number         // 1-100
  accuracy: number      // 0-100
  isWeak: boolean
  weakUntil?: string
  isVerified: boolean   // teacher verified
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

interface CareerSuggestion {
  icon: string
  title: string
  why: string
  skills: string[]
}

interface MyPortfolioData {
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
  careerSuggestions: CareerSuggestion[]
  aiBio: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', platinum: '#E5E4E2', diamond: '#B9F2FF',
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-white/20 bg-white/5 text-white/60',
  rare: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  epic: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  legendary: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300',
}

const SUBJECT_META: Record<string, { emoji: string; color: string; worldName: string }> = {
  'Riyaziyyat': { emoji: '🔢', color: '#60A5FA', worldName: 'Rəqəmlər Adası' },
  'Fizika': { emoji: '⚗️', color: '#A78BFA', worldName: 'Enerji Dünyası' },
  'İnformatika': { emoji: '💻', color: '#34D399', worldName: 'Kod Qalası' },
  'Kimya': { emoji: '🔬', color: '#FB923C', worldName: 'Kəşf Mağarası' },
  'Biologiya': { emoji: '🌿', color: '#4ADE80', worldName: 'Canlılar Vadisi' },
  'Tarix': { emoji: '📜', color: '#FBBF24', worldName: 'Zaman Qalası' },
  'Dil': { emoji: '📖', color: '#F472B6', worldName: 'Hekayələr Meşəsi' },
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

function isView1(ag: string) { return ['3-5', '6-8'].includes(ag) }
function isView2(ag: string) { return ['9-11', '12-14'].includes(ag) }

type ViewMode = '1' | '2' | '3'
function defaultView(ag: string): ViewMode {
  if (isView1(ag)) return '1'
  if (isView2(ag)) return '2'
  return '3'
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ count, max = 5, size = 16 }: { count: number; max?: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i < count ? '#FACC15' : 'rgba(255,255,255,0.1)'}
          stroke={i < count ? '#FACC15' : 'rgba(255,255,255,0.15)'}
          strokeWidth="1"
        >
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 1 — SKILL TREE (3-8 yaş)
// ══════════════════════════════════════════════════════════════════════════════

function SkillTreeView({ portfolio }: { portfolio: MyPortfolioData }) {
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null)

  const islandPositions = [
    { x: '50%', y: '15%' },
    { x: '20%', y: '35%' },
    { x: '75%', y: '32%' },
    { x: '35%', y: '58%' },
    { x: '68%', y: '60%' },
    { x: '15%', y: '72%' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fantasy background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-blue-950 to-purple-950">
        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 40}%` }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
        {/* Mountains */}
        <svg className="absolute bottom-0 w-full opacity-20" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <polygon points="0,300 200,100 400,200 600,80 800,180 1000,60 1200,150 1200,300" fill="#1E1B4B" />
        </svg>
        {/* Forest silhouette */}
        <div className="absolute bottom-0 w-full h-24 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute bottom-0 bg-emerald-900 rounded-t-full"
              style={{ left: `${i * 5.5}%`, width: `${20 + (i % 3) * 8}px`, height: `${40 + (i % 4) * 20}px` }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center pt-8 pb-4 px-4">
        <motion.div
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 border-4 border-yellow-400 flex items-center justify-center text-4xl mb-3 shadow-xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          {portfolio.user.avatar ? <img src={portfolio.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : '🦸'}
        </motion.div>
        <h1 className="text-2xl font-bold text-white">{portfolio.user.name}</h1>
        <p className="text-white/50 text-sm">Səviyyə {portfolio.user.level} · {portfolio.stats.totalXP.toLocaleString()} XP</p>
      </div>

      {/* World map — relative container */}
      <div className="relative z-10 w-full" style={{ height: '70vw', maxHeight: '520px' }}>
        {portfolio.skills.slice(0, 6).map((skill, i) => {
          const pos = islandPositions[i] ?? { x: '50%', y: '80%' }
          const meta = SUBJECT_META[skill.subject] ?? { emoji: '📖', color: '#9CA3AF', worldName: skill.subject }
          const unlocked = (skill.worlds?.unlocked ?? 0) > 0 || skill.stars > 0

          return (
            <motion.button
              key={skill.subject}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSkill(activeSkill?.subject === skill.subject ? null : skill)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pos.x, top: pos.y }}
            >
              <div className={`relative flex flex-col items-center gap-1 ${!unlocked ? 'opacity-50 grayscale' : ''}`}>
                {/* Island circle */}
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl border-2 transition-colors"
                  style={{
                    backgroundColor: unlocked ? meta.color + '30' : 'rgba(255,255,255,0.05)',
                    borderColor: unlocked ? meta.color + '80' : 'rgba(255,255,255,0.1)',
                    boxShadow: unlocked ? `0 0 20px ${meta.color}40` : 'none',
                  }}
                >
                  {!unlocked ? '🔒' : meta.emoji}
                </div>
                {/* Name */}
                <span className="text-[10px] sm:text-xs font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {meta.worldName}
                </span>
                {/* Stars */}
                {unlocked && <Stars count={skill.stars} size={10} />}
                {/* Lock label */}
                {!unlocked && (
                  <span className="text-[9px] text-white/40">Kilidli</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Island detail bottom sheet */}
      <AnimatePresence>
        {activeSkill && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A2E] border-t-2 border-indigo-500/40 rounded-t-3xl p-6 pb-10"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            {(() => {
              const meta = SUBJECT_META[activeSkill.subject] ?? { emoji: '📖', color: '#9CA3AF', worldName: activeSkill.subject }
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">{meta.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">{meta.worldName}</h3>
                      <p className="text-sm" style={{ color: meta.color }}>
                        {activeSkill.worlds?.unlocked ?? 0}/{activeSkill.worlds?.total ?? 5} ada açılıb
                      </p>
                    </div>
                  </div>
                  <p className="text-white/70 text-base font-medium">
                    Bu dünyada <span className="text-yellow-300 font-bold">{activeSkill.questionsAnswered} sual</span> cavabladın!
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/60">
                      <span>İrəliləyiş</span>
                      <span>{activeSkill.xp.toLocaleString()} XP</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(activeSkill.stars / 5) * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Növbəti mərhələ: {activeSkill.stars * 20 + 10} ulduz</span>
                      <Stars count={activeSkill.stars} size={14} />
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSkill(null)}
                    className="w-full py-3 bg-white/10 rounded-2xl text-white font-semibold hover:bg-white/15 transition-colors"
                  >
                    Bağla
                  </button>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 2 — TIMELINE (9-14 yaş)
// ══════════════════════════════════════════════════════════════════════════════

type TimelineFilter = 'all' | 'course' | 'competition' | 'badge' | 'milestone'

const EVENT_ICONS: Record<TimelineEventType, string> = {
  course: '🎓',
  competition: '🏆',
  badge: '🎖️',
  milestone: '📅',
  level: '⬆️',
  mystery: '🔮',
}

const EVENT_COLORS: Record<TimelineEventType, string> = {
  course: 'border-indigo-500/50 bg-indigo-500/10',
  competition: 'border-yellow-500/50 bg-yellow-500/10',
  badge: 'border-purple-500/50 bg-purple-500/10',
  milestone: 'border-emerald-500/50 bg-emerald-500/10',
  level: 'border-cyan-500/50 bg-cyan-500/10',
  mystery: 'border-yellow-400/60 bg-yellow-400/10',
}

function TimelineCard({ event, index }: { event: TimelineEvent; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const isLeft = index % 2 === 0

  return (
    <div ref={ref} className={`flex items-center gap-0 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={`flex-1 border rounded-2xl p-4 ${event.isMystery ? 'border-yellow-400/50 bg-yellow-400/10' : EVENT_COLORS[event.type]}`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{event.badgeEmoji ?? EVENT_ICONS[event.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">{event.title}</p>
            {event.subtitle && <p className="text-xs text-white/60 mt-0.5">{event.subtitle}</p>}
            {event.rank && (
              <div className="mt-1">
                <span className="text-xs font-bold" style={{ color: event.rank === 1 ? '#FACC15' : event.rank <= 3 ? '#C0C0C0' : '#9CA3AF' }}>
                  {event.rank <= 3 ? ['🥇 1-ci', '🥈 2-ci', '🥉 3-cü'][event.rank - 1] : `#${event.rank}-ci`}
                </span>
                {event.meta && <span className="text-xs text-white/40 ml-2">{event.meta}</span>}
              </div>
            )}
            {event.level && <p className="text-xs text-cyan-400 mt-0.5">Level {event.level}</p>}
            <p className="text-xs text-white/30 mt-1.5">{fmtDate(event.date)}</p>
          </div>
        </div>
      </motion.div>

      {/* Center dot */}
      <div className="relative shrink-0 w-12 flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`w-4 h-4 rounded-full border-2 border-[#0D0D0D] z-10 ${event.isMystery ? 'bg-yellow-400' : 'bg-indigo-500'}`}
        />
      </div>

      {/* Spacer for the other side */}
      <div className="flex-1" />
    </div>
  )
}

function TimelineView({ portfolio }: { portfolio: MyPortfolioData }) {
  const [filter, setFilter] = useState<TimelineFilter>('all')

  const filtered = portfolio.timeline.filter(ev =>
    filter === 'all' ? true :
      filter === 'milestone' ? (ev.type === 'milestone' || ev.type === 'level') :
        ev.type === filter
  )

  const FILTERS: { key: TimelineFilter; label: string }[] = [
    { key: 'all', label: 'Hamısı' },
    { key: 'course', label: '🎓 Kurslar' },
    { key: 'competition', label: '🏆 Yarışlar' },
    { key: 'badge', label: '🎖️ Nişanlar' },
    { key: 'milestone', label: '📅 Milestonlar' },
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-indigo-950 to-[#0D0D0D] pt-8 pb-6 px-4 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 border-4 border-yellow-400 flex items-center justify-center text-4xl mb-3 shadow-xl">
          {portfolio.user.avatar ? <img src={portfolio.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : portfolio.user.name[0]}
        </div>
        <h1 className="text-xl font-bold">{portfolio.user.name}</h1>
        <p className="text-white/50 text-sm">{portfolio.user.school ?? portfolio.user.city} · Səviyyə {portfolio.user.level}</p>
        <div className="flex justify-center gap-3 mt-4">
          {[
            { v: portfolio.stats.totalXP.toLocaleString(), l: 'XP' },
            { v: `${portfolio.stats.currentStreak}🔥`, l: 'Streak' },
            { v: portfolio.stats.totalQuestions.toString(), l: 'Sual' },
          ].map(({ v, l }) => (
            <div key={l} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <p className="font-bold text-sm">{v}</p>
              <p className="text-xs text-white/40">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${filter === f.key ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl mx-auto px-4 relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -translate-x-1/2" />

        <div className="space-y-4 relative">
          <AnimatePresence mode="popLayout">
            {filtered.map((event, i) => (
              <TimelineCard key={event.id} event={event} index={i} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-white/40">
              <div className="text-4xl mb-2">📭</div>
              {filter === 'all' ? 'Hələ portfolio hadisəsi yoxdur' : 'Bu kateqoriyada hələ nailiyyət yoxdur'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 3 — LINKEDIN STYLE (15+ yaş)
// ══════════════════════════════════════════════════════════════════════════════

function WeakCountdown({ until }: { until: string }) {
  const days = Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000))
  return (
    <span className="text-xs text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full ml-2">
      ⚡ {days} gün sonra yenilənir
    </span>
  )
}

// Bölmə boş olduqda — dürüst empty state (fake nailiyyət göstərilmir).
function SectionEmpty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-white/40">{text}</p>
}

function LinkedInView({
  portfolio,
  onShare,
  onPdf,
  onVisibility,
}: {
  portfolio: MyPortfolioData
  onShare: () => void
  onPdf: () => void
  onVisibility: (pub: boolean) => void
}) {
  const [bioEditing, setBioEditing] = useState(false)
  const [bioText, setBioText] = useState(portfolio.aiBio)
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

  const chartData = portfolio.competitions.map(c => ({
    name: c.title.slice(0, 12) + '…',
    xal: c.score,
  })).reverse()

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left sticky panel ───────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 space-y-4 self-start">
            {/* Profile card */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-indigo-900 to-purple-900" />
              <div className="px-4 pb-5">
                <div className="w-16 h-16 rounded-xl -mt-8 mb-3 bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-[#141414] flex items-center justify-center text-2xl font-bold shadow-lg relative">
                  {portfolio.user.avatar ? <img src={portfolio.user.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : portfolio.user.name[0]}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#141414] text-xs flex items-center justify-center"
                    style={{ backgroundColor: LEAGUE_COLORS[portfolio.user.league] + '33' }}>
                    {portfolio.user.league === 'gold' ? '🥇' : portfolio.user.league === 'diamond' ? '💎' : '🥈'}
                  </div>
                </div>
                <h2 className="font-bold text-base">{portfolio.user.name}</h2>
                <p className="text-xs text-white/50 mb-1">{portfolio.user.school ?? portfolio.user.city}</p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 mb-3">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  LogiCora Verified
                </div>

                {/* Level + Elo */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold">{portfolio.user.level}</p>
                    <p className="text-xs text-white/40">Səviyyə</p>
                  </div>
                  {portfolio.user.eloRating && (
                    <div className="bg-white/5 rounded-xl p-2 text-center">
                      <p className="text-lg font-bold" style={{ color: LEAGUE_COLORS[portfolio.user.league] }}>{portfolio.user.eloRating}</p>
                      <p className="text-xs text-white/40">Elo</p>
                    </div>
                  )}
                </div>

                {/* Top 3 skills */}
                <div className="space-y-2 mb-4">
                  {portfolio.skills.slice(0, 3).sort((a, b) => b.level - a.level).map(s => {
                    const meta = SUBJECT_META[s.subject] ?? { emoji: '📖', color: '#9CA3AF', worldName: s.subject }
                    return (
                      <div key={s.subject} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">{meta.emoji} {s.subject}</span>
                          <span style={{ color: meta.color }}>{s.level}%</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: meta.color }}
                            initial={{ width: 0 }} animate={{ width: `${s.level}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-2">
                  <button onClick={onShare}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold transition-colors">
                    🔗 Portfolionu Paylaş
                  </button>
                  <button onClick={onPdf}
                    className="w-full py-2 border border-white/15 hover:border-white/30 rounded-xl text-xs text-white/60 hover:text-white transition-colors">
                    📄 PDF Export
                  </button>
                  <button onClick={() => onVisibility(!portfolio.isPublic)}
                    className="w-full py-2 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1.5">
                    {portfolio.isPublic ? '👁️ İctimai' : '🔒 Gizli'}
                    <span className="text-white/30">— dəyiş</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right content ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Xülasə */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Xülasə</h2>
                <button onClick={() => setBioEditing(e => !e)} className="text-xs text-indigo-400 hover:text-indigo-300">
                  {bioEditing ? 'Saxla' : '✏️ Düzəliş'}
                </button>
              </div>
              {bioEditing ? (
                <textarea
                  value={bioText}
                  onChange={e => setBioText(e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              ) : (
                <p className="text-sm text-white/70 leading-relaxed">{bioText}</p>
              )}
            </div>

            {/* Bacarıqlar */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold mb-4">Bacarıqlar</h2>
              <div className="space-y-3">
                {portfolio.skills.length === 0 && (
                  <SectionEmpty text="Hələ bacarıq məlumatı yoxdur." />
                )}
                {portfolio.skills.map(s => {
                  const meta = SUBJECT_META[s.subject] ?? { emoji: '📖', color: '#9CA3AF', worldName: s.subject }
                  return (
                    <div key={s.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{meta.emoji} <span className="font-medium">{s.subject}</span></span>
                          {s.isVerified && (
                            <span className="text-xs text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded-full">✓ Təsdiqlənib</span>
                          )}
                          {s.isWeak && s.weakUntil && <WeakCountdown until={s.weakUntil} />}
                        </div>
                        <span className="text-xs text-white/50">{s.accuracy}% dəqiqlik</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: meta.color }}
                          initial={{ width: 0 }} animate={{ width: `${s.level}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nailiyyət nişanları */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold mb-4">Nailiyyət Nişanları</h2>
              <div className="flex flex-wrap gap-3">
                {portfolio.badges.length === 0 && (
                  <SectionEmpty text="Hələ mükafat əlavə edilməyib." />
                )}
                {portfolio.badges.map((badge, i) => (
                  <div
                    key={badge.id}
                    className="relative"
                    onMouseEnter={() => setHoveredBadge(badge.id)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-default ${RARITY_COLORS[badge.rarity]}`}
                    >
                      <span className="text-2xl">{badge.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold">{badge.name}</p>
                        <p className="text-[10px] opacity-50 capitalize">{badge.rarity}</p>
                      </div>
                    </motion.div>
                    {/* Tooltip */}
                    <AnimatePresence>
                      {hoveredBadge === badge.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E1E1E] border border-white/20 rounded-xl p-3 text-xs text-white/70 w-48 z-20 shadow-xl whitespace-normal"
                        >
                          <p className="font-semibold text-white mb-1">{badge.name}</p>
                          <p>{badge.description}</p>
                          <p className="text-white/30 mt-1">{fmtDate(badge.earnedAt)}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Sertifikatlar */}
            {portfolio.certificates.length > 0 && (
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                <h2 className="font-bold mb-4">Kurs Sertifikatları</h2>
                <div className="space-y-3">
                  {portfolio.certificates.map(cert => (
                    <div key={cert.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">🎓</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cert.courseName}</p>
                        <p className="text-xs text-white/40">{cert.teacherName} · {fmtDate(cert.issuedAt)}</p>
                      </div>
                      {cert.certUrl && (
                        <a href={cert.certUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">Gör →</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {portfolio.certificates.length === 0 && (
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                <h2 className="font-bold mb-4">Kurs Sertifikatları</h2>
                <SectionEmpty text="Hələ sertifikat yoxdur." />
              </div>
            )}

            {/* Yarış tarixi + chart */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <h2 className="font-bold mb-4">Yarış Tarixi</h2>
              {portfolio.competitions.length === 0 ? (
                <SectionEmpty text="Hələ yarış nəticəsi yoxdur." />
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {portfolio.competitions.map((comp, i) => (
                      <motion.div key={comp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${comp.rank === 1 ? 'bg-yellow-400/20' : comp.rank <= 3 ? 'bg-slate-400/20' : 'bg-white/10'
                          }`}>
                          {comp.rank <= 3 ? ['🥇', '🥈', '🥉'][comp.rank - 1] : `#${comp.rank}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{comp.title}</p>
                          <p className="text-xs text-white/40">{comp.totalParticipants} iştirakçı · {fmtDate(comp.date)}</p>
                        </div>
                        <span className="text-sm font-bold text-white/70 shrink-0">{comp.score} xal</span>
                      </motion.div>
                    ))}
                  </div>
                  {/* Score chart */}
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                        <Line type="monotone" dataKey="xal" stroke="#818CF8" strokeWidth={2} dot={{ fill: '#818CF8', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            {/* Peşə Kompas */}
            <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🧭</span>
                <h2 className="font-bold">Peşə Kompas</h2>
                <span className="text-xs bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full">AI</span>
              </div>
              <p className="text-xs text-white/50 mb-4">Sənin profilinə görə tövsiyə olunan sahələr:</p>
              <div className="space-y-3">
                {portfolio.careerSuggestions.length === 0 && (
                  <SectionEmpty text="Karyera tövsiyələri hələ hazır deyil." />
                )}
                {portfolio.careerSuggestions.map((career, i) => (
                  <motion.div key={career.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{career.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{career.title}</p>
                        <p className="text-xs text-white/50 mt-0.5">{career.why}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {career.skills.map(s => (
                            <span key={s} className="text-xs bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARE CARD MODAL
// ══════════════════════════════════════════════════════════════════════════════

function ShareCardModal({ portfolio, onClose }: { portfolio: MyPortfolioData; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<'story' | 'pro'>('pro')
  const [generating, setGenerating] = useState(false)

  const renderStoryCard = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = 1080, h = 1920
    ctx.canvas.width = w; ctx.canvas.height = h
    // Background
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#0F0C29'); grad.addColorStop(0.5, '#302B63'); grad.addColorStop(1, '#24243E')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)
    // Avatar circle
    ctx.beginPath(); ctx.arc(w / 2, 600, 160, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(99,102,241,0.5)'; ctx.fill()
    // Name
    ctx.fillStyle = '#fff'; ctx.font = 'bold 80px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(portfolio.user.name, w / 2, 840)
    // Stats
    ctx.font = '50px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`⚡ ${portfolio.stats.totalXP.toLocaleString()} XP  🔥 ${portfolio.stats.currentStreak} gün`, w / 2, 940)
    // Level
    ctx.font = 'bold 60px sans-serif'; ctx.fillStyle = '#FACC15'
    ctx.fillText(`Səviyyə ${portfolio.user.level}`, w / 2, 1040)
    // Watermark
    ctx.font = '40px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('logicora.az', w / 2, 1850)
  }, [portfolio])

  const renderProCard = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = 1200, h = 630
    ctx.canvas.width = w; ctx.canvas.height = h
    // Background
    ctx.fillStyle = '#0D0D0D'; ctx.fillRect(0, 0, w, h)
    // Left accent
    const grad = ctx.createLinearGradient(0, 0, 300, h)
    grad.addColorStop(0, 'rgba(99,102,241,0.3)'); grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 300, h)
    // Avatar
    ctx.beginPath(); ctx.arc(150, 200, 80, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(99,102,241,0.6)'; ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(portfolio.user.name[0], 150, 220)
    // Name
    ctx.textAlign = 'left'; ctx.font = 'bold 48px sans-serif'; ctx.fillStyle = '#fff'
    ctx.fillText(portfolio.user.name, 320, 180)
    ctx.font = '30px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText(`LogiCora Verified · Səviyyə ${portfolio.user.level}`, 320, 230)
    // Top skills
    ctx.font = 'bold 28px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'
    portfolio.skills.slice(0, 3).forEach((s, i) => {
      const meta = SUBJECT_META[s.subject] ?? { emoji: '📖', color: '#9CA3AF', worldName: s.subject }
      ctx.fillStyle = meta.color
      ctx.fillText(`${meta.emoji} ${s.subject}: ${s.level}%`, 320, 310 + i * 60)
    })
    // Link
    ctx.textAlign = 'right'; ctx.font = '26px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText(portfolio.shareLink, w - 40, h - 30)
  }, [portfolio])

  const handleGenerate = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setGenerating(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (format === 'story') renderStoryCard(ctx)
    else renderProCard(ctx)
    setGenerating(false)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${portfolio.user.name.replace(' ', '_')}_LogiCora_Kart.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Paylaşma Kartı</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white">✕</button>
        </div>

        {/* Format selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['story', 'pro'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)}
              className={`py-3 rounded-xl border text-sm font-medium transition-colors ${format === f ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/50 hover:text-white'
                }`}
            >
              {f === 'story' ? '📱 Instagram Story' : '💼 Professional'}
            </button>
          ))}
        </div>

        {/* Preview canvas */}
        <canvas ref={canvasRef} className="w-full rounded-xl bg-white/5 border border-white/10 max-h-48 object-contain" />

        <div className="flex gap-3">
          <button onClick={handleGenerate} disabled={generating}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {generating ? 'Hazırlanır...' : 'Kart yarat'}
          </button>
          <button onClick={handleDownload}
            className="flex-1 py-2.5 border border-white/15 hover:border-white/30 rounded-xl text-sm text-white/70 hover:text-white transition-colors">
            Yüklə PNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Export
// ══════════════════════════════════════════════════════════════════════════════

// Backend xətası: fake portfolio göstərmirik — real error state.
function PassportErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Təhsil pasportu yüklənmədi</h1>
        <p className="text-white/50 text-sm mb-6">Zəhmət olmasa yenidən cəhd edin.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to={APP_ROUTES.DASHBOARD.STUDENT}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors">
            Dashboard-a qayıt
          </Link>
          <button onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold transition-all">
            Yenidən yoxla
          </button>
        </div>
      </div>
    </div>
  )
}

// Backend 200 amma məzmun yoxdursa — empty state (fake nailiyyət göstərilmir).
function PassportEmptyState() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-4">📭</div>
        <h1 className="text-2xl font-bold mb-2">Təhsil pasportun hələ formalaşmayıb</h1>
        <p className="text-white/50 text-sm mb-6">Quiz həll et, kurslara qoşul — nailiyyətlərin burada toplanacaq.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to={APP_ROUTES.DAILY}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold transition-all">
            Quizə başla
          </Link>
          <Link to={APP_ROUTES.COURSES}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors">
            Kurslara bax
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function MyPortfolio() {
  const user = useSelector((s: RootState) => s.auth.user)
  const ageGroup = (user as { ageGroup?: string } | null)?.ageGroup ?? '15-17'
  const qc = useQueryClient()
  const printRef = useRef<HTMLDivElement>(null)

  const [view, setView] = useState<ViewMode>(defaultView(ageGroup))
  const [showShare, setShowShare] = useState(false)

  const { data: portfolio, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-portfolio'],
    queryFn: () =>
      api.get(API_ROUTES.PORTFOLIO.MY)
        .then(r => r.data.data as MyPortfolioData),
  })

  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      api.patch(API_ROUTES.PORTFOLIO.VISIBILITY, { isPublic }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-portfolio'] }),
    onError: (_err, isPublic) => {
      qc.setQueryData(['my-portfolio'], (old: MyPortfolioData | undefined) =>
        old ? { ...old, isPublic } : old
      )
    },
  })

  const handlePdf = async () => {
    if (!portfolio || !printRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(printRef.current, { backgroundColor: '#0D0D0D', scale: 1.5 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${portfolio?.user.name ?? 'Portfolio'}_LogiCora.pdf`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse mx-auto" />
          <div className="h-4 bg-white/10 rounded-xl w-32 mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  // Backend xətası → real error state (fake portfolio yox)
  if (isError) {
    return <PassportErrorState onRetry={() => refetch()} />
  }

  // Portfolio yoxdursa → empty state
  if (!portfolio) {
    return <PassportEmptyState />
  }

  // Backend 200 amma bütün məzmun boşdursa → empty state
  const isEmptyPassport =
    !portfolio.skills?.length &&
    !portfolio.timeline?.length &&
    !portfolio.badges?.length &&
    !portfolio.certificates?.length &&
    !portfolio.competitions?.length
  if (isEmptyPassport) {
    return <PassportEmptyState />
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* View switcher bar */}
      <div className="sticky top-0 z-30 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-1">
          {([['1', '🗺️ Xəritə'], ['2', '📅 Xronologiya'], ['3', '💼 Professional']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowShare(true)} className="px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/60 hover:text-white transition-colors">
          🔗 Paylaş
        </button>
      </div>

      {/* Content */}
      <div ref={printRef}>
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {view === '1' && <SkillTreeView portfolio={portfolio} />}
            {view === '2' && <TimelineView portfolio={portfolio} />}
            {view === '3' && (
              <LinkedInView
                portfolio={portfolio}
                onShare={() => setShowShare(true)}
                onPdf={handlePdf}
                onVisibility={v => visibilityMutation.mutate(v)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && <ShareCardModal portfolio={portfolio} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </div>
  )
}
