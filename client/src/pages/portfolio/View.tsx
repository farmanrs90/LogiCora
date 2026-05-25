import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/axios'
import { API_ROUTES } from '../../constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubjectStat {
  subject: string
  stars: number      // 0-5
  xp: number
  questionsAnswered: number
  accuracy: number   // 0-100
  isWeak: boolean
  weakUntil?: string
}

interface Badge {
  id: string
  name: string
  emoji: string
  earnedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface Competition {
  id: string
  title: string
  rank: number
  totalParticipants: number
  date: string
  subject: string
}

interface Certificate {
  id: string
  courseName: string
  teacherName: string
  issuedAt: string
  thumbnailUrl?: string
}

interface PortfolioData {
  id: string
  user: {
    name: string
    avatar?: string
    ageGroup: string
    age: number
    city: string
    school?: string
    bio?: string
    joinedAt: string
  }
  stats: {
    totalXP: number
    currentStreak: number
    longestStreak: number
    totalQuestions: number
    accuracy: number
    rank: number
    league: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
    level: number
  }
  subjects: SubjectStat[]
  badges: Badge[]
  competitions: Competition[]
  certificates: Certificate[]
  shareLink: string
  isPublic: boolean
}

// ── Mock ──────────────────────────────────────────────────────────────────────

const MOCK: PortfolioData = {
  id: 'p1',
  user: {
    name: 'Anar Hüseynov',
    avatar: undefined,
    ageGroup: '15-17',
    age: 16,
    city: 'Bakı',
    school: 'Məktəb #6 (Dərin Texnologiyalar)',
    bio: 'Proqramlaşdırma və riyaziyyat sevgisi. Gələcəkdə süni intellekt mühəndisi olmaq istəyirəm.',
    joinedAt: '2025-09-01',
  },
  stats: {
    totalXP: 14840,
    currentStreak: 22,
    longestStreak: 45,
    totalQuestions: 1240,
    accuracy: 78,
    rank: 3,
    league: 'gold',
    level: 28,
  },
  subjects: [
    { subject: 'Riyaziyyat', stars: 5, xp: 4200, questionsAnswered: 380, accuracy: 85, isWeak: false },
    { subject: 'Fizika', stars: 4, xp: 2800, questionsAnswered: 220, accuracy: 79, isWeak: false },
    { subject: 'İnformatika', stars: 5, xp: 3600, questionsAnswered: 310, accuracy: 88, isWeak: false },
    { subject: 'Kimya', stars: 2, xp: 800, questionsAnswered: 90, accuracy: 51, isWeak: true, weakUntil: '2026-05-30' },
    { subject: 'Biologiya', stars: 3, xp: 1400, questionsAnswered: 140, accuracy: 63, isWeak: false },
    { subject: 'Tarix', stars: 3, xp: 1200, questionsAnswered: 100, accuracy: 70, isWeak: false },
  ],
  badges: [
    { id: 'b1', name: 'İlk Qalibiyyət', emoji: '🏆', earnedAt: '2025-10-05', rarity: 'common' },
    { id: 'b2', name: '30 Günlük Streak', emoji: '🔥', earnedAt: '2025-11-01', rarity: 'rare' },
    { id: 'b3', name: 'Riyaziyyat Çempionu', emoji: '🧮', earnedAt: '2025-12-15', rarity: 'epic' },
    { id: 'b4', name: 'Qurucu Tələbə', emoji: '🥇', earnedAt: '2025-09-05', rarity: 'legendary' },
    { id: 'b5', name: 'Sürət Ustası', emoji: '⚡', earnedAt: '2026-01-10', rarity: 'rare' },
    { id: 'b6', name: 'Həftənin Sirri', emoji: '🔮', earnedAt: '2026-02-14', rarity: 'epic' },
  ],
  competitions: [
    { id: 'k1', title: 'Riyaziyyat Olimpiadası #4', rank: 1, totalParticipants: 840, date: '2026-03-01', subject: 'Riyaziyyat' },
    { id: 'k2', title: 'İnformatika Sprint', rank: 2, totalParticipants: 520, date: '2026-02-15', subject: 'İnformatika' },
    { id: 'k3', title: 'Fizika Yarışması', rank: 5, totalParticipants: 380, date: '2026-01-20', subject: 'Fizika' },
  ],
  certificates: [
    { id: 'cert1', courseName: 'Python ilə Proqramlaşdırma', teacherName: 'Rəşad Əliyev', issuedAt: '2026-03-20' },
    { id: 'cert2', courseName: 'Web Development Əsasları', teacherName: 'Günel Hüseyni', issuedAt: '2026-01-15' },
  ],
  shareLink: 'logicora.az/portfolio/anar-h',
  isPublic: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
  platinum: '#E5E4E2', diamond: '#B9F2FF',
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-white/20 bg-white/5',
  rare: 'border-blue-500/40 bg-blue-500/10',
  epic: 'border-purple-500/40 bg-purple-500/10',
  legendary: 'border-yellow-400/50 bg-yellow-400/10',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long' })
}

function isYoung(ageGroup: string): boolean {
  const young = ['3-5', '6-8', '9-11', '12-14']
  return young.includes(ageGroup)
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= count ? '#FACC15' : 'rgba(255,255,255,0.1)'}
          stroke={i <= count ? '#FACC15' : 'rgba(255,255,255,0.15)'}
          strokeWidth="1"
        >
          <polygon points="10,2 12.9,7.7 19,8.6 14.5,13 15.8,19.1 10,16.1 4.2,19.1 5.5,13 1,8.6 7.1,7.7" />
        </svg>
      ))}
    </span>
  )
}

// ── Share Button ──────────────────────────────────────────────────────────────

function ShareButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `https://${link}`
    if (navigator.share) {
      await navigator.share({ title: 'LogiCora Portfolio', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          Kopyalandı!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
          Paylaş
        </>
      )}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// YOUNG VIEW (3–14 yaş) — Skill Tree / Oyun Xəritəsi
// ══════════════════════════════════════════════════════════════════════════════

const SUBJECT_WORLDS: Record<string, { emoji: string; color: string; bg: string }> = {
  'Riyaziyyat': { emoji: '🧮', color: '#60A5FA', bg: 'from-blue-600/30 to-blue-900/20' },
  'Fizika':     { emoji: '⚗️', color: '#A78BFA', bg: 'from-violet-600/30 to-violet-900/20' },
  'İnformatika':{ emoji: '💻', color: '#34D399', bg: 'from-emerald-600/30 to-emerald-900/20' },
  'Kimya':      { emoji: '🔬', color: '#FB923C', bg: 'from-orange-600/30 to-orange-900/20' },
  'Biologiya':  { emoji: '🌿', color: '#4ADE80', bg: 'from-green-600/30 to-green-900/20' },
  'Tarix':      { emoji: '📜', color: '#FBBF24', bg: 'from-amber-600/30 to-amber-900/20' },
}

function YoungView({ portfolio }: { portfolio: PortfolioData }) {
  const [activeWorld, setActiveWorld] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white pb-16">
      {/* Hero — animated avatar + stats */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950 to-[#0D0D0D] pt-12 pb-8 px-4 text-center">
        {/* Floating stars */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-yellow-300 text-lg select-none pointer-events-none"
            style={{ left: `${8 + (i * 8)}%`, top: `${10 + (i % 4) * 20}%` }}
            animate={{ y: [-6, 6, -6], opacity: [0.3, 0.8, 0.3], rotate: [0, 15, 0] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
          >
            ★
          </motion.div>
        ))}

        {/* Avatar */}
        <motion.div
          className="relative w-28 h-28 mx-auto mb-4"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 border-4 border-yellow-400 shadow-xl flex items-center justify-center text-5xl">
            {portfolio.user.avatar ? (
              <img src={portfolio.user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
            ) : '🦸'}
          </div>
          {/* League badge */}
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-[#0D0D0D] flex items-center justify-center text-base"
            style={{ backgroundColor: LEAGUE_COLORS[portfolio.stats.league] + '33', borderColor: LEAGUE_COLORS[portfolio.stats.league] }}
          >
            {portfolio.stats.league === 'diamond' ? '💎' : portfolio.stats.league === 'gold' ? '🥇' : portfolio.stats.league === 'platinum' ? '🔷' : portfolio.stats.league === 'silver' ? '🥈' : '🥉'}
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-1">{portfolio.user.name}</h1>
        <p className="text-white/50 text-sm mb-6">{portfolio.user.school ?? portfolio.user.city} · Səviyyə {portfolio.stats.level}</p>

        {/* Fun stat bubbles */}
        <div className="flex justify-center gap-3 flex-wrap">
          {[
            { label: 'XP', value: portfolio.stats.totalXP.toLocaleString(), icon: '⚡', color: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300' },
            { label: 'Streak', value: `${portfolio.stats.currentStreak} gün`, icon: '🔥', color: 'bg-orange-400/20 border-orange-400/40 text-orange-300' },
            { label: 'Sual', value: portfolio.stats.totalQuestions.toString(), icon: '✅', color: 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300' },
          ].map(({ label, value, icon, color }) => (
            <motion.div
              key={label}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.08 }}
              className={`border rounded-2xl px-4 py-2 text-center ${color}`}
            >
              <div className="text-2xl">{icon}</div>
              <div className="text-lg font-bold">{value}</div>
              <div className="text-xs opacity-70">{label}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4">
          <ShareButton link={portfolio.shareLink} />
        </div>
      </div>

      {/* Skill Worlds Grid */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <h2 className="text-lg font-bold mb-4 text-center">🗺️ Bacarıq Xəritəsi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {portfolio.subjects.map((sub, i) => {
            const world = SUBJECT_WORLDS[sub.subject] ?? { emoji: '📖', color: '#9CA3AF', bg: 'from-gray-600/30 to-gray-900/20' }
            return (
              <motion.button
                key={sub.subject}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveWorld(activeWorld === sub.subject ? null : sub.subject)}
                className={`relative rounded-3xl p-5 bg-gradient-to-br ${world.bg} border text-center cursor-pointer transition-all ${
                  activeWorld === sub.subject ? 'border-white/30 shadow-lg' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Weak badge */}
                {sub.isWeak && (
                  <div className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">
                    ⚡ Yaxşılaşır
                  </div>
                )}

                <div className="text-4xl mb-2">{world.emoji}</div>
                <p className="text-sm font-bold mb-2" style={{ color: world.color }}>{sub.subject}</p>
                <Stars count={sub.stars} size={14} />

                <AnimatePresence>
                  {activeWorld === sub.subject && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs text-left overflow-hidden"
                    >
                      <div className="flex justify-between text-white/60">
                        <span>XP</span><span className="text-white font-medium">{sub.xp.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Dəqiqlik</span><span className="text-white font-medium">{sub.accuracy}%</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Suallar</span><span className="text-white font-medium">{sub.questionsAnswered}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="max-w-2xl mx-auto px-4 mt-10">
        <h2 className="text-lg font-bold mb-4 text-center">🎖️ Nailiyyətlər</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {portfolio.badges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              className={`flex flex-col items-center p-3 rounded-2xl border cursor-default ${RARITY_COLORS[badge.rarity]}`}
              title={badge.name}
            >
              <span className="text-3xl">{badge.emoji}</span>
              <span className="text-[10px] text-white/50 mt-1 text-center leading-tight">{badge.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent competitions */}
      {portfolio.competitions.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-10">
          <h2 className="text-lg font-bold mb-4 text-center">🏆 Yarışmalar</h2>
          <div className="space-y-3">
            {portfolio.competitions.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
                  comp.rank === 1 ? 'bg-yellow-400/20 text-yellow-300' :
                  comp.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                  comp.rank === 3 ? 'bg-amber-700/20 text-amber-600' :
                  'bg-white/10 text-white/50'
                }`}>
                  {comp.rank <= 3 ? ['🥇', '🥈', '🥉'][comp.rank - 1] : `#${comp.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{comp.title}</p>
                  <p className="text-xs text-white/40">{comp.totalParticipants} iştirakçı · {fmtDate(comp.date)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADULT VIEW (15+ yaş) — LinkedIn-style
// ══════════════════════════════════════════════════════════════════════════════

function AdultView({ portfolio }: { portfolio: PortfolioData }) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Top action bar */}
      <div className="sticky top-0 z-20 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          {portfolio.shareLink}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
            </svg>
            PDF
          </button>
          <ShareButton link={portfolio.shareLink} />
        </div>
      </div>

      <div ref={printRef} className="max-w-4xl mx-auto px-4 py-8 space-y-6 print:py-0 print:px-0">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden"
        >
          {/* Cover gradient */}
          <div
            className="h-24 bg-gradient-to-r from-indigo-900 via-purple-900 to-[#141414]"
            style={{ backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(147,51,234,0.3) 50%, transparent 100%)' }}
          />
          <div className="px-6 pb-6">
            {/* Avatar — negative margin */}
            <div className="relative w-20 h-20 -mt-10 mb-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-[#141414] flex items-center justify-center text-3xl font-bold shadow-xl">
              {portfolio.user.avatar ? (
                <img src={portfolio.user.avatar} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : portfolio.user.name[0]}
              {/* League */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#141414] flex items-center justify-center text-xs"
                style={{ backgroundColor: LEAGUE_COLORS[portfolio.stats.league] + '33' }}
              >
                {portfolio.stats.league === 'diamond' ? '💎' : portfolio.stats.league === 'gold' ? '🥇' : portfolio.stats.league === 'silver' ? '🥈' : '🥉'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{portfolio.user.name}</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  {portfolio.user.school ?? portfolio.user.city}
                  {portfolio.user.city && portfolio.user.school && ` · ${portfolio.user.city}`}
                </p>
                {portfolio.user.bio && (
                  <p className="text-white/70 text-sm mt-3 max-w-xl leading-relaxed">{portfolio.user.bio}</p>
                )}
                <p className="text-xs text-white/30 mt-2">
                  LogiCora üzvü: {fmtDate(portfolio.user.joinedAt)}
                </p>
              </div>

              {/* Level badge */}
              <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl p-3 shrink-0 text-center">
                <p className="text-2xl font-bold">{portfolio.stats.level}</p>
                <p className="text-xs text-white/40">Səviyyə</p>
                <div className="mt-1 text-xs capitalize" style={{ color: LEAGUE_COLORS[portfolio.stats.league] }}>
                  {portfolio.stats.league}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Ümumi XP', value: portfolio.stats.totalXP.toLocaleString(), sub: 'xp', color: 'text-yellow-400' },
            { label: 'Dəqiqlik', value: `${portfolio.stats.accuracy}%`, sub: `${portfolio.stats.totalQuestions} sual`, color: 'text-emerald-400' },
            { label: 'Streak rekoru', value: `${portfolio.stats.longestStreak} gün`, sub: `İndiki: ${portfolio.stats.currentStreak}`, color: 'text-orange-400' },
            { label: 'Milli reyting', value: `#${portfolio.stats.rank}`, sub: 'platforma üzrə', color: 'text-indigo-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-[#141414] border border-white/10 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-medium text-white/70 mt-0.5">{label}</p>
              <p className="text-xs text-white/30 mt-0.5">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Subject breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-bold">Fənn üzrə nəticələr</h2>
          <div className="space-y-3">
            {portfolio.subjects.map(sub => {
              const world = SUBJECT_WORLDS[sub.subject] ?? { emoji: '📖', color: '#9CA3AF', bg: '' }
              return (
                <div key={sub.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{world.emoji}</span>
                      <span className="font-medium">{sub.subject}</span>
                      {sub.isWeak && (
                        <span className="text-xs text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">⚡ Yaxşılaşır</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Stars count={sub.stars} size={12} />
                      <span className="text-white/50 text-xs w-10 text-right">{sub.accuracy}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: world.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(sub.stars / 5) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Certificates */}
          {portfolio.certificates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Sertifikatlar</h2>
              <div className="space-y-3">
                {portfolio.certificates.map(cert => (
                  <div key={cert.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="1.5">
                        <path d="M12 15l-2 5-1-1-5 1 1-5-1-1 5-2 3 3zM18 8a5 5 0 00-8-4 4 4 0 105 5 5 5 0 003-1z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cert.courseName}</p>
                      <p className="text-xs text-white/40">{cert.teacherName} · {fmtDate(cert.issuedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Competitions */}
          {portfolio.competitions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Yarışma nəticələri</h2>
              <div className="space-y-3">
                {portfolio.competitions.map(comp => (
                  <div key={comp.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                      comp.rank === 1 ? 'bg-yellow-400/20' : comp.rank <= 3 ? 'bg-slate-400/20' : 'bg-white/10'
                    }`}>
                      {comp.rank <= 3 ? ['🥇', '🥈', '🥉'][comp.rank - 1] : `#${comp.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{comp.title}</p>
                      <p className="text-xs text-white/40">{comp.totalParticipants} iştirakçı · {fmtDate(comp.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-base font-bold">Nailiyyət nişanları</h2>
          <div className="flex flex-wrap gap-3">
            {portfolio.badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${RARITY_COLORS[badge.rarity]}`}
                title={fmtDate(badge.earnedAt)}
              >
                <span className="text-xl">{badge.emoji}</span>
                <div>
                  <p className="text-xs font-semibold">{badge.name}</p>
                  <p className="text-[10px] text-white/30 capitalize">{badge.rarity}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-white/30">
          LogiCora — Azərbaycanın təhsil super-platforması · logicora.az
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════════════════════

export default function PortfolioView() {
  const { link } = useParams<{ link: string }>()

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', link],
    queryFn: () =>
      api.get<PortfolioData>(API_ROUTES.PORTFOLIO.BY_LINK(link!))
        .then(r => r.data)
        .catch(() => MOCK),
    enabled: !!link,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse mx-auto" />
          <div className="h-5 bg-white/10 rounded-xl w-40 mx-auto animate-pulse" />
          <div className="h-3 bg-white/10 rounded-xl w-24 mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-center px-4">
        <div className="space-y-4">
          <div className="text-6xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Portfolio tapılmadı</h1>
          <p className="text-white/50 text-sm">Bu link mövcud deyil və ya gizli edilib.</p>
        </div>
      </div>
    )
  }

  return isYoung(portfolio.user.ageGroup)
    ? <YoungView portfolio={portfolio} />
    : <AdultView portfolio={portfolio} />
}
