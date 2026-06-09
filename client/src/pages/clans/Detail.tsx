import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import type { ClanMember } from '../../types'
import Spinner from '../../components/Spinner'

// ── Extended types ─────────────────────────────────────────────────────────

interface ClanMemberDetail extends ClanMember {
  name:        string
  avatarColor: string
  totalXP:     number
  weeklyXP:    number
  level:       number
  streak:      number
}

interface ClanDetailData {
  _id:           string
  name:          string
  slug:          string
  schoolName:    string
  emblem:        string | null
  totalXP:       number
  weeklyXP:      number
  wins:          number
  losses:        number
  description:   string
  city:          string
  foundedAt:     string
  membersDetail: ClanMemberDetail[]
  rank:          number
  battleHistory: BattleRecord[]
  radarStats:    RadarStat[]
}

interface BattleRecord {
  id:             string
  opponentName:   string
  opponentEmblem: string
  result:         'win' | 'loss' | 'draw'
  myScore:        number
  opponentScore:  number
  subject:        string
  date:           string
}

interface RadarStat {
  subject:  string
  value:    number
  fullMark: number
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CLAN: ClanDetailData = {
  _id: 'clan-1',
  name: 'Şimşəklər',
  slug: 'simsekler',
  schoolName: 'Bakı Dövlət Məktəbi #23',
  emblem: null,
  totalXP: 48200,
  weeklyXP: 3750,
  wins: 18,
  losses: 4,
  description: 'Biz birlikdə daha güclüyük! Hər gün öyrənir, hər yarışda qalib gəlirik.',
  city: 'Bakı',
  foundedAt: '2024-09-01',
  rank: 3,
  membersDetail: [
    { studentId: 'u1', role: 'leader', joinedAt: '2024-09-01', name: 'Aytən M.',  avatarColor: '#9333EA', totalXP: 8400, weeklyXP: 620, level: 14, streak: 22 },
    { studentId: 'u2', role: 'member', joinedAt: '2024-09-05', name: 'Kənan H.',  avatarColor: '#3B82F6', totalXP: 7100, weeklyXP: 540, level: 12, streak: 15 },
    { studentId: 'u3', role: 'member', joinedAt: '2024-09-10', name: 'Nigar Ə.',  avatarColor: '#06B6D4', totalXP: 6900, weeklyXP: 510, level: 11, streak: 18 },
    { studentId: 'u4', role: 'member', joinedAt: '2024-09-12', name: 'Orxan T.',  avatarColor: '#F97316', totalXP: 6200, weeklyXP: 480, level: 10, streak: 9  },
    { studentId: 'u5', role: 'member', joinedAt: '2024-09-15', name: 'Leyla K.',  avatarColor: '#EC4899', totalXP: 5800, weeklyXP: 450, level: 10, streak: 12 },
    { studentId: 'u6', role: 'member', joinedAt: '2024-10-01', name: 'Rauf N.',   avatarColor: '#22C55E', totalXP: 4900, weeklyXP: 390, level: 8,  streak: 6  },
    { studentId: 'u7', role: 'member', joinedAt: '2024-10-10', name: 'Günel A.',  avatarColor: '#EAB308', totalXP: 4500, weeklyXP: 360, level: 7,  streak: 4  },
    { studentId: 'u8', role: 'member', joinedAt: '2024-11-01', name: 'Fərid M.',  avatarColor: '#8B5CF6', totalXP: 3400, weeklyXP: 400, level: 6,  streak: 20 },
  ],
  battleHistory: [
    { id: 'b1', opponentName: 'Kartallar', opponentEmblem: '🦅', result: 'win',  myScore: 850, opponentScore: 720, subject: 'Riyaziyyat', date: '2024-12-10' },
    { id: 'b2', opponentName: 'Aslanlar',  opponentEmblem: '🦁', result: 'win',  myScore: 920, opponentScore: 800, subject: 'Fizika',     date: '2024-12-08' },
    { id: 'b3', opponentName: 'Qurtlar',   opponentEmblem: '🐺', result: 'loss', myScore: 640, opponentScore: 780, subject: 'Kimya',      date: '2024-12-05' },
    { id: 'b4', opponentName: 'Ulduzlar',  opponentEmblem: '⭐', result: 'win',  myScore: 900, opponentScore: 710, subject: 'Tarix',      date: '2024-12-02' },
    { id: 'b5', opponentName: 'Timsahlar', opponentEmblem: '🐊', result: 'win',  myScore: 770, opponentScore: 650, subject: 'Riyaziyyat', date: '2024-11-28' },
    { id: 'b6', opponentName: 'Şahinlər',  opponentEmblem: '🦅', result: 'loss', myScore: 590, opponentScore: 640, subject: 'Fizika',     date: '2024-11-24' },
  ],
  radarStats: [
    { subject: 'Riyaziyyat', value: 88, fullMark: 100 },
    { subject: 'Fizika',     value: 72, fullMark: 100 },
    { subject: 'Kimya',      value: 65, fullMark: 100 },
    { subject: 'Tarix',      value: 80, fullMark: 100 },
    { subject: 'Ədəbiyyat',  value: 76, fullMark: 100 },
    { subject: 'Biologiya',  value: 70, fullMark: 100 },
  ],
}

const WEEKLY_XP_TREND = [
  { day: 'B.e.',  xp: 480 },
  { day: 'Ç.a.',  xp: 620 },
  { day: 'Çər.',  xp: 510 },
  { day: 'C.a.',  xp: 750 },
  { day: 'Cüm.',  xp: 900 },
  { day: 'Şən.',  xp: 340 },
  { day: 'Baz.',  xp: 150 },
]

const LEADERBOARD_LEVELS = ['Sinif', 'Məktəb', 'Şəhər', 'Ölkə']

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Aslanlar',  school: '#12', xp: 51400, emblem: '🦁', color: '#FFD700', isMe: false },
  { rank: 2, name: 'Kartallar', school: '#17', xp: 49800, emblem: '🦅', color: '#C0C0C0', isMe: false },
  { rank: 3, name: 'Şimşəklər', school: '#23', xp: 48200, emblem: '⚡', color: '#CD7F32', isMe: true  },
  { rank: 4, name: 'Ulduzlar',  school: '#31', xp: 45100, emblem: '⭐', color: '#9CA3AF', isMe: false },
  { rank: 5, name: 'Qurtlar',   school: '#9',  xp: 43600, emblem: '🐺', color: '#9CA3AF', isMe: false },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function ClanEmblem({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl font-black flex-shrink-0"
      style={{
        width:      size,
        height:     size,
        background: `linear-gradient(135deg, ${color}30, ${color}15)`,
        border:     `2px solid ${color}50`,
        boxShadow:  `0 0 32px ${color}40, inset 0 0 16px ${color}10`,
        fontSize:   size * 0.4,
      }}
    >
      ⚡
      <div
        className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent)` }}
      />
    </div>
  )
}

function MemberRow({ m, rank }: { m: ClanMemberDetail; rank: number }) {
  const rankColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
  const medals = ['🥇', '🥈', '🥉']
  const medal = rank <= 3 ? medals[rank - 1] : String(rank)

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors"
    >
      <span className="w-6 text-center font-black text-sm" style={{ color: rankColors[rank] ?? '#9CA3AF' }}>
        {medal}
      </span>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
        style={{ backgroundColor: m.avatarColor, boxShadow: `0 0 12px ${m.avatarColor}50` }}
      >
        {m.name?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm truncate">{m.name}</span>
          {m.role === 'leader' && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
              style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}
            >
              Lider
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-[#9CA3AF]">Lv.{m.level}</span>
          <span className="text-[11px] text-orange-400">🔥 {m.streak}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-bold text-sm">{m.weeklyXP.toLocaleString()}</div>
        <div className="text-[10px] text-[#9CA3AF]">həftəlik XP</div>
      </div>
    </motion.div>
  )
}

function BattleCard({ b }: { b: BattleRecord }) {
  const isWin  = b.result === 'win'
  const isDraw = b.result === 'draw'
  const resultColor = isWin ? '#22C55E' : isDraw ? '#EAB308' : '#EF4444'
  const resultLabel = isWin ? 'Qalibiyyət' : isDraw ? 'Bərabərə' : 'Məğlubiyyət'
  const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : '😔'
  const d = new Date(b.date)
  const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avg','Sen','Okt','Noy','Dek']
  const dateStr = `${d.getDate()} ${months[d.getMonth()]}`

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: `${resultColor}08`, border: `1px solid ${resultColor}20` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {b.opponentEmblem}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-sm">{b.opponentName}</div>
        <div className="text-[#9CA3AF] text-[11px]">{b.subject} · {dateStr}</div>
      </div>
      <div className="text-right">
        <div className="font-black text-sm" style={{ color: resultColor }}>{b.myScore} – {b.opponentScore}</div>
        <div className="text-[10px]" style={{ color: resultColor }}>{resultEmoji} {resultLabel}</div>
      </div>
    </motion.div>
  )
}

function ChallengeModal({ clan, onClose, onSend }: {
  clan:    ClanDetailData
  onClose: () => void
  onSend:  (subject: string) => void
}) {
  const [subject, setSubject] = useState('Riyaziyyat')
  const subjects = ['Riyaziyyat', 'Fizika', 'Kimya', 'Tarix', 'Ədəbiyyat', 'Biologiya']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.3)' }}
          >
            ⚔️
          </div>
          <div>
            <h2 className="text-white font-black text-xl">Klan Mübarizəsi</h2>
            <p className="text-[#9CA3AF] text-sm">vs. {clan.name}</p>
          </div>
        </div>

        <p className="text-[#9CA3AF] text-sm mb-3">Mövzu seç:</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className="py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: subject === s ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
                border:     `1px solid ${subject === s ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color:      subject === s ? '#C084FC' : '#9CA3AF',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className="flex items-center justify-between mb-6 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="text-center">
            <div className="text-white font-bold text-sm">Şimşəklər</div>
            <div className="text-[#9CA3AF] text-[11px]">{MOCK_CLAN.wins}G / {MOCK_CLAN.losses}M</div>
          </div>
          <span className="text-2xl font-black text-[#9CA3AF]">VS</span>
          <div className="text-center">
            <div className="text-white font-bold text-sm">{clan.name}</div>
            <div className="text-[#9CA3AF] text-[11px]">Rəqib klan</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10 hover:text-white transition-colors"
          >
            Ləğv et
          </button>
          <motion.button
            onClick={() => onSend(subject)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }}
          >
            ⚔️ Dəvət Et
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function LeaderboardTab({ color }: { color: string }) {
  const [activeLevel, setActiveLevel] = useState(0)

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {LEADERBOARD_LEVELS.map((lv, i) => (
          <button
            key={lv}
            onClick={() => setActiveLevel(i)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: activeLevel === i ? `${color}20` : 'rgba(255,255,255,0.04)',
              border:     `1px solid ${activeLevel === i ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
              color:      activeLevel === i ? color : '#9CA3AF',
            }}
          >
            {lv}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {MOCK_LEADERBOARD.map((entry, i) => (
          <motion.div
            key={entry.rank}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: entry.isMe ? `${color}10` : 'rgba(255,255,255,0.03)',
              border:     `1px solid ${entry.isMe ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <span className="w-8 text-center font-black text-sm" style={{ color: entry.color }}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {entry.emblem}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{entry.name}</span>
                {entry.isMe && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: `${color}20`, color }}
                  >
                    Sən
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9CA3AF]">Məktəb {entry.school}</div>
            </div>
            <span className="font-bold text-sm text-white">{entry.xp.toLocaleString()} XP</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ClanDetail() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const user        = useSelector((s: RootState) => s.auth.user)
  const queryClient = useQueryClient()

  const [tab, setTab]                     = useState<'members' | 'battles' | 'stats' | 'leaderboard'>('members')
  const [showChallenge, setShowChallenge] = useState(false)

  const { data: clan, isLoading } = useQuery<ClanDetailData>({
    queryKey: ['clan', slug],
    queryFn:  () => api.get<{ data: ClanDetailData }>(API_ROUTES.CLANS.BY_SLUG(slug!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_CLAN),
    enabled:  !!slug,
    staleTime: 1000 * 60 * 2,
  })

  const c = clan ?? MOCK_CLAN

  const joinMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.CLANS.JOIN(c._id)),
    onSuccess: () => {
      toast.success('Klana uğurla qoşuldun! 🎉')
      queryClient.invalidateQueries({ queryKey: ['clan', slug] })
    },
    onError: () => toast.error('Klana qoşularkən xəta baş verdi.'),
  })

  const leaveMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.CLANS.LEAVE),
    onSuccess: () => {
      toast.success('Klandan ayrıldın.')
      navigate(APP_ROUTES.DASHBOARD.STUDENT)
    },
    onError: () => toast.error('Xəta baş verdi.'),
  })

  const challengeMutation = useMutation({
    mutationFn: (subject: string) => api.post(API_ROUTES.CLANS.CHALLENGE(c._id), { subject }),
    onSuccess: () => {
      toast.success('Mübarizə dəvəti göndərildi! ⚔️')
      setShowChallenge(false)
    },
    onError: () => {
      toast.error('Dəvət göndərilə bilmədi.')
      setShowChallenge(false)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isMember = c.membersDetail.some(m => m.studentId === user?._id)
  const isLeader = c.membersDetail.find(m => m.studentId === user?._id)?.role === 'leader'
  const leader   = c.membersDetail.find(m => m.role === 'leader')
  const sortedMembers = [...c.membersDetail].sort((a, b) => b.weeklyXP - a.weeklyXP)
  const winRate = Math.round((c.wins / Math.max(c.wins + c.losses, 1)) * 100)

  const tabItems: { key: typeof tab; label: string; emoji: string }[] = [
    { key: 'members',     label: 'Üzvlər',     emoji: '👥' },
    { key: 'battles',     label: 'Döyüşlər',   emoji: '⚔️' },
    { key: 'stats',       label: 'Statistika', emoji: '📊' },
    { key: 'leaderboard', label: 'Liderlik',   emoji: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:   `linear-gradient(180deg, ${avatarColor}20 0%, transparent 100%)`,
          borderBottom: `1px solid ${avatarColor}20`,
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${avatarColor}, transparent)` }}
        />

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-6">
          {/* Emblem + info */}
          <div className="flex items-start gap-5">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <ClanEmblem color={avatarColor} size={88} />
            </motion.div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <motion.h1
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-black text-2xl text-white"
                >
                  {c.name}
                </motion.h1>
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="px-2.5 py-1 rounded-lg font-black text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${avatarColor}25, ${avatarColor}10)`,
                    border:     `1px solid ${avatarColor}40`,
                    color:      avatarColor,
                  }}
                >
                  #{c.rank} Ölkə
                </motion.span>
              </div>
              <p className="text-[#9CA3AF] text-sm mt-1">{c.schoolName}</p>
              <p className="text-[#9CA3AF] text-xs mt-0.5">📍 {c.city}</p>
              <p className="text-white/70 text-sm mt-2 leading-snug line-clamp-2">{c.description}</p>
            </div>
          </div>

          {/* Stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-4 gap-3 mt-6"
          >
            {[
              { label: 'Üzv',        value: c.membersDetail.length,               emoji: '👥' },
              { label: 'Həftəlik',   value: `${(c.weeklyXP/1000).toFixed(1)}K XP`, emoji: '⚡' },
              { label: 'Qalibiyyət', value: `${winRate}%`,                         emoji: '🏆' },
              { label: 'Zəfər',      value: c.wins,                               emoji: '🥇' },
            ].map(s => (
              <div
                key={s.label}
                className="flex flex-col items-center p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-black text-white text-base mt-1">{s.value}</span>
                <span className="text-[#9CA3AF] text-[10px] text-center">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-3 mt-5"
          >
            {!isMember ? (
              <motion.button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
                  boxShadow:  `0 4px 16px ${avatarColor}40`,
                }}
              >
                {joinMutation.isPending ? 'Qoşulur...' : '➕ Klana Qoşul'}
              </motion.button>
            ) : (
              <>
                <motion.button
                  onClick={() => setShowChallenge(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-2xl font-bold text-white text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #9333EA, #6366F1)',
                    boxShadow:  '0 4px 16px rgba(147,51,234,0.4)',
                  }}
                >
                  ⚔️ Döyüşə Dəvət Et
                </motion.button>
                {!isLeader && (
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="px-4 py-3 rounded-2xl font-bold text-[#EF4444] text-sm border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                  >
                    Ayrıl
                  </button>
                )}
              </>
            )}
          </motion.div>

          {/* Leader */}
          {leader && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-2 mt-4"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ backgroundColor: leader.avatarColor }}
              >
                {leader.name?.charAt(0) ?? '?'}
              </div>
              <span className="text-[#9CA3AF] text-xs">
                Lider: <span className="text-white font-bold">{leader.name}</span>
              </span>
              <span className="text-[#FFD700] text-xs">👑</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 mt-6">

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: tab === t.key ? `${avatarColor}20` : 'transparent',
                color:      tab === t.key ? avatarColor : '#9CA3AF',
                border:     tab === t.key ? `1px solid ${avatarColor}30` : '1px solid transparent',
              }}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >

            {/* MEMBERS */}
            {tab === 'members' && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-white font-bold text-sm">{c.membersDetail.length} Üzv</span>
                  <span className="text-[#9CA3AF] text-xs">Həftəlik XP sırası</span>
                </div>
                {sortedMembers.map((m, i) => (
                  <MemberRow key={m.studentId} m={m} rank={i + 1} />
                ))}
              </div>
            )}

            {/* BATTLES */}
            {tab === 'battles' && (
              <div>
                <div
                  className="flex items-center justify-around p-4 rounded-2xl mb-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="text-center">
                    <div className="font-black text-3xl text-green-400">{c.wins}</div>
                    <div className="text-[#9CA3AF] text-xs mt-0.5">Qalibiyyət</div>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="font-black text-3xl text-white">{winRate}%</div>
                    <div className="text-[#9CA3AF] text-xs mt-0.5">Uğur Nisbəti</div>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="font-black text-3xl text-red-400">{c.losses}</div>
                    <div className="text-[#9CA3AF] text-xs mt-0.5">Məğlubiyyət</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {c.battleHistory.map(b => <BattleCard key={b.id} b={b} />)}
                </div>
              </div>
            )}

            {/* STATS */}
            {tab === 'stats' && (
              <div className="space-y-4">
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-white font-bold text-sm mb-3">📈 Həftəlik XP Trendi</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={WEEKLY_XP_TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="clanXpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={avatarColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={avatarColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: `1px solid ${avatarColor}40`, borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: '#9CA3AF' }}
                        itemStyle={{ color: avatarColor }}
                      />
                      <Area type="monotone" dataKey="xp" stroke={avatarColor} strokeWidth={2} fill="url(#clanXpGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-white font-bold text-sm mb-3">🕸️ Fənn Gücü</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={c.radarStats}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <Radar
                        name="Klan"
                        dataKey="value"
                        stroke={avatarColor}
                        fill={avatarColor}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-white font-bold text-sm">Fənn Bölgüsü</p>
                  {c.radarStats.map(r => (
                    <div key={r.subject}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#9CA3AF] text-xs">{r.subject}</span>
                        <span className="text-white text-xs font-bold">{r.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${r.value}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${avatarColor}, #9333EA)` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEADERBOARD */}
            {tab === 'leaderboard' && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <LeaderboardTab color={avatarColor} />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Challenge modal */}
      <AnimatePresence>
        {showChallenge && (
          <ChallengeModal
            clan={c}
            onClose={() => setShowChallenge(false)}
            onSend={subject => challengeMutation.mutate(subject)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
