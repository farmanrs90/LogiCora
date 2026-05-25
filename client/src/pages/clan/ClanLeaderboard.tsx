import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'

// ── Types ──────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank:        number
  _id:         string
  name:        string
  slug:        string
  schoolName:  string
  city:        string
  color:       string
  emoji:       string
  totalXP:     number
  weeklyXP:    number
  wins:        number
  losses:      number
  memberCount: number
  isMyClан:    boolean
  prevRank:    number | null
}

// ── Mock data ──────────────────────────────────────────────────────────────

const buildMock = (offset = 0): LeaderboardEntry[] => [
  { rank: 1+offset, _id: 'c1', name: 'Aslanlar',   slug: 'aslanlar',   schoolName: 'Məktəb #12', city: 'Bakı',       color: '#EAB308', emoji: '🦁', totalXP: 51400, weeklyXP: 4200, wins: 22, losses: 3,  memberCount: 12, isMyClан: false, prevRank: 1+offset },
  { rank: 2+offset, _id: 'c2', name: 'Kartallar',  slug: 'kartallar',  schoolName: 'Məktəb #17', city: 'Bakı',       color: '#F97316', emoji: '🦅', totalXP: 49800, weeklyXP: 3800, wins: 20, losses: 4,  memberCount: 10, isMyClан: false, prevRank: 3+offset },
  { rank: 3+offset, _id: 'c3', name: 'Şimşəklər',  slug: 'simsekler',  schoolName: 'Məktəb #23', city: 'Bakı',       color: '#9333EA', emoji: '⚡', totalXP: 48200, weeklyXP: 3750, wins: 18, losses: 4,  memberCount: 8,  isMyClан: true,  prevRank: 4+offset },
  { rank: 4+offset, _id: 'c4', name: 'Ulduzlar',   slug: 'ulduzlar',   schoolName: 'Məktəb #31', city: 'Gəncə',      color: '#3B82F6', emoji: '⭐', totalXP: 45100, weeklyXP: 3400, wins: 16, losses: 6,  memberCount: 11, isMyClан: false, prevRank: 2+offset },
  { rank: 5+offset, _id: 'c5', name: 'Qurtlar',    slug: 'qurtlar',    schoolName: 'Məktəb #9',  city: 'Sumqayıt',   color: '#6B7280', emoji: '🐺', totalXP: 43600, weeklyXP: 3100, wins: 15, losses: 7,  memberCount: 9,  isMyClан: false, prevRank: 5+offset },
  { rank: 6+offset, _id: 'c6', name: 'Timsahlar',  slug: 'timsahlar',  schoolName: 'Məktəb #5',  city: 'Lənkəran',   color: '#22C55E', emoji: '🐊', totalXP: 41200, weeklyXP: 2800, wins: 13, losses: 7,  memberCount: 10, isMyClан: false, prevRank: 6+offset },
  { rank: 7+offset, _id: 'c7', name: 'Şahinlər',   slug: 'sahinler',   schoolName: 'Məktəb #44', city: 'Mingəçevir', color: '#EC4899', emoji: '🦅', totalXP: 39500, weeklyXP: 2600, wins: 12, losses: 9,  memberCount: 8,  isMyClан: false, prevRank: 8+offset },
  { rank: 8+offset, _id: 'c8', name: 'Çaqqallar',  slug: 'caqqallar',  schoolName: 'Məktəb #2',  city: 'Naxçıvan',   color: '#06B6D4', emoji: '🦊', totalXP: 37100, weeklyXP: 2300, wins: 11, losses: 9,  memberCount: 12, isMyClан: false, prevRank: 7+offset },
  { rank: 9+offset, _id: 'c9', name: 'Tigrler',    slug: 'tigrler',    schoolName: 'Məktəb #18', city: 'Gəncə',      color: '#8B5CF6', emoji: '🐯', totalXP: 35800, weeklyXP: 2100, wins: 10, losses: 10, memberCount: 9,  isMyClан: false, prevRank: 9+offset },
  { rank: 10+offset, _id: 'c10',name: 'Alovlar',   slug: 'alovlar',    schoolName: 'Məktəb #33', city: 'Bakı',       color: '#F97316', emoji: '🔥', totalXP: 34200, weeklyXP: 1900, wins: 9,  losses: 11, memberCount: 7,  isMyClан: false, prevRank: 11+offset },
]

const MOCK_CLASS    = buildMock(0)
const MOCK_SCHOOL   = buildMock(0)
const MOCK_CITY     = buildMock(2)
const MOCK_COUNTRY  = buildMock(5)

// ── Scope tabs ─────────────────────────────────────────────────────────────

type Scope = 'class' | 'school' | 'city' | 'country'

const SCOPES: { key: Scope; label: string; emoji: string }[] = [
  { key: 'class',   label: 'Sinif',  emoji: '🏫' },
  { key: 'school',  label: 'Məktəb', emoji: '🏛️' },
  { key: 'city',    label: 'Şəhər',  emoji: '🌆' },
  { key: 'country', label: 'Ölkə',   emoji: '🇦🇿' },
]

const MOCK_MAP: Record<Scope, LeaderboardEntry[]> = {
  class:   MOCK_CLASS,
  school:  MOCK_SCHOOL,
  city:    MOCK_CITY,
  country: MOCK_COUNTRY,
}

// ── Rank change indicator ──────────────────────────────────────────────────

function RankChange({ current, prev }: { current: number; prev: number | null }) {
  if (prev === null || prev === current) return <span className="w-5" />
  const up = current < prev
  return (
    <motion.span
      initial={{ opacity: 0, y: up ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs font-bold"
      style={{ color: up ? '#22C55E' : '#EF4444' }}
    >
      {up ? '▲' : '▼'}
    </motion.span>
  )
}

// ── Rank display ───────────────────────────────────────────────────────────

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return <span className="text-[#9CA3AF] font-black text-sm w-7 text-center">{rank}</span>
}

// ── Top 3 podium ───────────────────────────────────────────────────────────

function TopThreePodium({ entries }: { entries: LeaderboardEntry[] }) {
  const first  = entries.find(e => e.rank === 1)
  const second = entries.find(e => e.rank === 2)
  const third  = entries.find(e => e.rank === 3)

  if (!first) return null

  function Block({ e, h, delay, pos }: { e: LeaderboardEntry; h: number; delay: number; pos: 1|2|3 }) {
    const medals = { 1: '👑', 2: '🥈', 3: '🥉' }
    return (
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay }}
        className="flex flex-col items-center gap-2"
      >
        {/* Emblem */}
        <div className="relative">
          <div
            className="rounded-2xl flex items-center justify-center text-3xl"
            style={{
              width:     pos === 1 ? 68 : 56,
              height:    pos === 1 ? 68 : 56,
              background: `${e.color}20`,
              border:    `2px solid ${e.color}50`,
              boxShadow: `0 0 20px ${e.color}40`,
            }}
          >
            {e.emoji}
          </div>
          {pos === 1 && (
            <motion.span
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              {medals[1]}
            </motion.span>
          )}
          {pos !== 1 && (
            <span className="absolute -top-3 -right-1 text-base">{medals[pos]}</span>
          )}
        </div>

        <p className="text-white font-bold text-xs text-center max-w-[72px] truncate">{e.name}</p>
        <p className="text-[#9CA3AF] text-[10px]">{(e.totalXP / 1000).toFixed(1)}K XP</p>

        {/* Podium base */}
        <div
          className="w-20 rounded-t-xl flex items-end justify-center pb-2"
          style={{
            height: h,
            background: pos === 1
              ? 'linear-gradient(180deg, rgba(255,215,0,0.18), rgba(255,215,0,0.06))'
              : 'rgba(255,255,255,0.05)',
            border:        `1px solid ${pos === 1 ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderBottom: 'none',
          }}
        >
          <span className="font-black text-3xl opacity-20 text-white">{pos}</span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="flex items-end justify-center gap-3 mt-6 mb-2">
      {second && <Block e={second} h={72} delay={0.5} pos={2} />}
      {first  && <Block e={first}  h={100} delay={0.2} pos={1} />}
      {third  && <Block e={third}  h={56} delay={0.7} pos={3} />}
    </div>
  )
}

// ── Share clan card ────────────────────────────────────────────────────────

function handleShare(entry: LeaderboardEntry, scope: Scope) {
  const scopeLabels: Record<Scope, string> = {
    class:   'sinifdə',
    school:  'məktəbdə',
    city:    'şəhərdə',
    country: 'ölkədə',
  }
  const text = `Klanım "${entry.name}" ${scopeLabels[scope]} ${entry.rank}-cidir! 🏆 #LogiCora #Azərbaycan`
  if (navigator.share) {
    navigator.share({ title: 'LogiCora Klan Liderliyi', text }).catch(() => {})
  } else {
    navigator.clipboard.writeText(text).then(() => toast.success('Mətn kopyalandı!')).catch(() => {})
  }
}

// ── Row component ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry, index, color, onNavigate, scope,
}: {
  entry:      LeaderboardEntry
  index:      number
  color:      string
  onNavigate: (slug: string) => void
  scope:      Scope
}) {
  const isMy = entry.isMyClан

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.055 }}
      onClick={() => onNavigate(entry.slug)}
      className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        background: isMy ? `${color}12` : 'rgba(255,255,255,0.03)',
        border:     `1px solid ${isMy ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        <RankDisplay rank={entry.rank} />
      </div>

      {/* Rank change */}
      <RankChange current={entry.rank} prev={entry.prevRank} />

      {/* Emblem */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `${entry.color}15`, border: `1px solid ${entry.color}30` }}
      >
        {entry.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm truncate">{entry.name}</span>
          {isMy && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0"
              style={{ background: `${color}20`, color }}
            >
              Sənin klanın
            </span>
          )}
        </div>
        <div className="text-[#9CA3AF] text-[11px] truncate">{entry.schoolName} · {entry.city}</div>
        <div className="text-[#9CA3AF] text-[11px]">{entry.memberCount} üzv · {entry.wins}G {entry.losses}M</div>
      </div>

      {/* XP + share */}
      <div className="text-right flex flex-col items-end gap-1">
        <span className="font-black text-white text-sm">{(entry.totalXP / 1000).toFixed(1)}K</span>
        <span className="text-[#9CA3AF] text-[10px]">XP</span>
        {isMy && (
          <button
            onClick={e => { e.stopPropagation(); handleShare(entry, scope) }}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5"
            style={{ background: `${color}20`, color }}
          >
            Paylaş
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ClanLeaderboard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const [scope, setScope] = useState<Scope>('country')

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['clan-leaderboard', scope],
    queryFn:  () => api.get<{ data: LeaderboardEntry[] }>(
                      `${API_ROUTES.CLANS.LEADERBOARD}?type=${scope}`
                    ).then(r => r.data.data).catch(() => MOCK_MAP[scope]),
    staleTime:       1000 * 60,
    refetchInterval: 1000 * 60,
  })

  const list = entries ?? MOCK_MAP[scope]
  const myClan = list.find(e => e.isMyClан)

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* Header */}
      <div
        className="relative overflow-hidden px-4 pt-10 pb-6 text-center"
        style={{ borderBottom: `1px solid rgba(255,215,0,0.12)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(255,215,0,0.06) 0%, transparent 100%)' }}
        />
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const }}
          className="text-6xl mb-3"
        >
          🏆
        </motion.div>
        <h1
          className="font-black text-2xl"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Klan Liderliyi
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Ən güclü klanlar</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">

        {/* Scope tabs */}
        <div className="relative flex border-b border-white/10 mb-2">
          {SCOPES.map(s => {
            const active = scope === s.key
            return (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-bold transition-colors relative"
                style={{ color: active ? avatarColor : '#9CA3AF' }}
              >
                <span className="text-lg">{s.emoji}</span>
                <span>{s.label}</span>
                {active && (
                  <motion.div
                    layoutId="lb-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: avatarColor }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* My clan always visible at top if not in top 10 */}
        {myClan && myClan.rank > 10 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-2xl mb-3"
            style={{ background: `${avatarColor}12`, border: `1px solid ${avatarColor}30` }}
          >
            <span className="text-[#9CA3AF] text-xs">Sənin klanın:</span>
            <span className="text-white font-bold text-sm">{myClan.name}</span>
            <span className="font-black text-sm" style={{ color: avatarColor }}>#{myClan.rank}</span>
            <span className="text-[#9CA3AF] text-xs ml-auto">{(myClan.totalXP / 1000).toFixed(1)}K XP</span>
          </motion.div>
        )}

        {/* Top 3 podium */}
        {!isLoading && <TopThreePodium entries={list} />}

        {/* Full list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={scope}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 mt-4"
          >
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                ))
              : list.map((entry, i) => (
                  <LeaderboardRow
                    key={entry._id}
                    entry={entry}
                    index={i}
                    color={avatarColor}
                    onNavigate={slug => navigate(APP_ROUTES.CLAN(slug))}
                    scope={scope}
                  />
                ))
            }
          </motion.div>
        </AnimatePresence>

        {/* Refresh notice */}
        <p className="text-center text-[#9CA3AF] text-xs mt-6">
          Hər dəqiqə yenilənir · Son yenilənmə: indi
        </p>
      </div>
    </div>
  )
}
