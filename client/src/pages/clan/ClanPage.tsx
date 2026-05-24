import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import Spinner from '../../components/Spinner'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClanMemberFull {
  studentId:   string
  userId:      string
  name:        string
  surname:     string
  avatarColor: string
  level:       number
  weeklyXP:    number
  totalXP:     number
  streak:      number
  role:        'leader' | 'member'
  joinedAt:    string
}

interface BattleHistoryItem {
  _id:           string
  opponentSlug:  string
  opponentName:  string
  opponentColor: string
  opponentEmoji: string
  ourScore:      number
  theirScore:    number
  result:        'win' | 'loss' | 'draw' | 'ongoing'
  subject:       string
  format:        string
  endedAt:       string | null
  startedAt:     string
}

interface ClanStats {
  weeklyXPHistory: { week: string; xp: number }[]
  memberXPShare:   { name: string; xp: number }[]
  strongestSubject: string
  strongestPct:    number
  mostActiveUser:  { name: string; avatarColor: string }
  bestBattleScore: number
}

interface ClanData {
  _id:       string
  name:      string
  slug:      string
  schoolName: string
  city:      string
  emblem:    string | null
  color:     string
  totalXP:   number
  weeklyXP:  number
  wins:      number
  losses:    number
  rank:      number
  totalBattles: number
  description: string
  foundedAt: string
}

interface ClanSearchResult {
  _id:     string
  name:    string
  slug:    string
  schoolName: string
  city:    string
  color:   string
  totalXP: number
  rank:    number
  memberCount: number
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CLAN: ClanData = {
  _id: 'clan-1', name: 'Şimşəklər', slug: 'simsekler',
  schoolName: 'Bakı Dövlət Məktəbi #47', city: 'Bakı',
  emblem: null, color: '#9333EA',
  totalXP: 48200, weeklyXP: 3750, wins: 18, losses: 4,
  rank: 3, totalBattles: 23,
  description: 'Biz birlikdə daha güclüyük! Hər gün öyrənir, hər yarışda qalib gəlirik.',
  foundedAt: '2024-09-01',
}

const MOCK_MEMBERS: ClanMemberFull[] = [
  { studentId: 'u1', userId: 'u1', name: 'Aytən',  surname: 'M.', avatarColor: '#9333EA', level: 14, weeklyXP: 620, totalXP: 8400, streak: 22, role: 'leader', joinedAt: '2024-09-01' },
  { studentId: 'u2', userId: 'u2', name: 'Kənan',  surname: 'H.', avatarColor: '#3B82F6', level: 12, weeklyXP: 540, totalXP: 7100, streak: 15, role: 'member', joinedAt: '2024-09-05' },
  { studentId: 'u3', userId: 'u3', name: 'Nigar',  surname: 'Ə.', avatarColor: '#06B6D4', level: 11, weeklyXP: 510, totalXP: 6900, streak: 18, role: 'member', joinedAt: '2024-09-10' },
  { studentId: 'u4', userId: 'u4', name: 'Orxan',  surname: 'T.', avatarColor: '#F97316', level: 10, weeklyXP: 480, totalXP: 6200, streak: 9,  role: 'member', joinedAt: '2024-09-12' },
  { studentId: 'u5', userId: 'u5', name: 'Leyla',  surname: 'K.', avatarColor: '#EC4899', level: 10, weeklyXP: 450, totalXP: 5800, streak: 12, role: 'member', joinedAt: '2024-09-15' },
  { studentId: 'u6', userId: 'u6', name: 'Rauf',   surname: 'N.', avatarColor: '#22C55E', level:  8, weeklyXP: 390, totalXP: 4900, streak: 6,  role: 'member', joinedAt: '2024-10-01' },
  { studentId: 'u7', userId: 'u7', name: 'Günel',  surname: 'A.', avatarColor: '#EAB308', level:  7, weeklyXP: 360, totalXP: 4500, streak: 4,  role: 'member', joinedAt: '2024-10-10' },
  { studentId: 'u8', userId: 'u8', name: 'Fərid',  surname: 'M.', avatarColor: '#8B5CF6', level:  6, weeklyXP: 400, totalXP: 3400, streak: 20, role: 'member', joinedAt: '2024-11-01' },
]

const MOCK_BATTLES: BattleHistoryItem[] = [
  { _id: 'b1', opponentSlug: 'kartallar', opponentName: 'Kartallar', opponentColor: '#F97316', opponentEmoji: '🦅', ourScore: 850, theirScore: 720, result: 'win',  subject: 'Riyaziyyat', format: 'Sürət',  endedAt: '2024-12-10', startedAt: '2024-12-10' },
  { _id: 'b2', opponentSlug: 'aslanlar',  opponentName: 'Aslanlar',  opponentColor: '#EAB308', opponentEmoji: '🦁', ourScore: 920, theirScore: 800, result: 'win',  subject: 'Fizika',     format: 'Qarışıq', endedAt: '2024-12-08', startedAt: '2024-12-08' },
  { _id: 'b3', opponentSlug: 'qurtlar',   opponentName: 'Qurtlar',   opponentColor: '#9CA3AF', opponentEmoji: '🐺', ourScore: 640, theirScore: 780, result: 'loss', subject: 'Kimya',      format: 'Fənn',    endedAt: '2024-12-05', startedAt: '2024-12-05' },
  { _id: 'b4', opponentSlug: 'ulduzlar',  opponentName: 'Ulduzlar',  opponentColor: '#3B82F6', opponentEmoji: '⭐', ourScore: 900, theirScore: 710, result: 'win',  subject: 'Tarix',      format: 'Sürət',   endedAt: '2024-12-02', startedAt: '2024-12-02' },
  { _id: 'b5', opponentSlug: 'timsahlar', opponentName: 'Timsahlar', opponentColor: '#22C55E', opponentEmoji: '🐊', ourScore: 770, theirScore: 650, result: 'win',  subject: 'Riyaziyyat', format: 'Sürət',   endedAt: '2024-11-28', startedAt: '2024-11-28' },
  { _id: 'b6', opponentSlug: 'sahinler',  opponentName: 'Şahinlər',  opponentColor: '#EC4899', opponentEmoji: '🦅', ourScore: 590, theirScore: 640, result: 'loss', subject: 'Fizika',     format: 'Qarışıq', endedAt: '2024-11-24', startedAt: '2024-11-24' },
]

const MOCK_STATS: ClanStats = {
  weeklyXPHistory: [
    { week: 'H1', xp: 2100 }, { week: 'H2', xp: 2600 }, { week: 'H3', xp: 2300 },
    { week: 'H4', xp: 3100 }, { week: 'H5', xp: 3400 }, { week: 'H6', xp: 2900 },
    { week: 'H7', xp: 3200 }, { week: 'H8', xp: 3750 },
  ],
  memberXPShare: [
    { name: 'Aytən M.', xp: 8400 }, { name: 'Kənan H.', xp: 7100 },
    { name: 'Nigar Ə.', xp: 6900 }, { name: 'Orxan T.', xp: 6200 },
    { name: 'Digərləri', xp: 19600 },
  ],
  strongestSubject: 'Riyaziyyat',
  strongestPct: 67,
  mostActiveUser: { name: 'Aytən M.', avatarColor: '#9333EA' },
  bestBattleScore: 920,
}

const MOCK_SEARCH: ClanSearchResult[] = [
  { _id: 'c2', name: 'Kartallar', slug: 'kartallar', schoolName: 'Məktəb #12', city: 'Bakı',    color: '#F97316', totalXP: 45000, rank: 5,  memberCount: 10 },
  { _id: 'c3', name: 'Aslanlar',  slug: 'aslanlar',  schoolName: 'Məktəb #17', city: 'Gəncə',  color: '#EAB308', totalXP: 51000, rank: 2,  memberCount: 12 },
  { _id: 'c4', name: 'Qurtlar',   slug: 'qurtlar',   schoolName: 'Məktəb #9',  city: 'Sumqayıt', color: '#9CA3AF', totalXP: 39000, rank: 8, memberCount: 9  },
]

const PIE_COLORS = ['#9333EA', '#3B82F6', '#06B6D4', '#F97316', '#6B7280']

// ── Animated particles (Framer Motion only) ────────────────────────────────

function ClanParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  4 + (i % 4) * 2,
            height: 4 + (i % 4) * 2,
            background: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : 'rgba(255,255,255,0.3)',
            left: `${5 + (i * 17) % 90}%`,
            top:  `${10 + (i * 23) % 80}%`,
          }}
          animate={{
            y:       [0, -12 - i * 2, 0],
            opacity: [0.2, 0.6, 0.2],
            scale:   [1, 1.3, 1],
          }}
          transition={{
            duration:   2.5 + (i % 5) * 0.6,
            repeat:     Infinity,
            delay:      (i * 0.22) % 3,
            ease:       'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Emblem ─────────────────────────────────────────────────────────────────

function ClanEmblemDisplay({ color, emoji, size = 96 }: { color: string; emoji: string; size?: number }) {
  return (
    <motion.div
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="relative flex items-center justify-center rounded-3xl flex-shrink-0"
      style={{
        width:      size,
        height:     size,
        background: `linear-gradient(135deg, ${color}35, ${color}18)`,
        border:     `3px solid ${color}60`,
        boxShadow:  `0 0 40px ${color}50, inset 0 0 20px ${color}12`,
        fontSize:   size * 0.42,
      }}
    >
      {emoji}
      <div
        className="absolute inset-0 rounded-3xl opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(circle at 35% 35%, ${color}, transparent 60%)` }}
      />
    </motion.div>
  )
}

// ── Member card ────────────────────────────────────────────────────────────

function MemberCard({ m, rank, onChallenge }: {
  m:           ClanMemberFull
  rank:        number
  onChallenge: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const rankMedals = ['🥇', '🥈', '🥉']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-2xl p-4 transition-all overflow-hidden"
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
        border:     `1px solid ${hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3 text-lg">
        {rank <= 3 ? rankMedals[rank - 1] : <span className="text-[#9CA3AF] text-xs font-black">#{rank}</span>}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
            style={{ backgroundColor: m.avatarColor, boxShadow: `0 0 16px ${m.avatarColor}50` }}
          >
            {m.name.charAt(0)}
          </div>
          {m.role === 'leader' && (
            <motion.span
              className="absolute -top-2 -right-1 text-sm"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              👑
            </motion.span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">{m.name} {m.surname}</span>
            {m.role === 'leader' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
                Lider
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#9CA3AF] text-xs">Lv.{m.level}</span>
            <span className="text-orange-400 text-xs">🔥 {m.streak}</span>
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[#9CA3AF] text-[11px]">Bu həftə</span>
          <span className="text-white text-[11px] font-bold">{m.weeklyXP} XP</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((m.weeklyXP / 700) * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: rank * 0.04 }}
            className="h-full rounded-full"
            style={{ backgroundColor: m.avatarColor }}
          />
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2 mt-3"
          >
            <Link
              to={APP_ROUTES.PORTFOLIO(m.userId)}
              className="flex-1 py-1.5 rounded-xl text-center text-xs font-bold text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Profil gör
            </Link>
            <button
              onClick={() => onChallenge(m.userId)}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
              style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.4)' }}
            >
              ⚔️ 1v1 Çağır
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── XP count-up ────────────────────────────────────────────────────────────

function XPNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv  = useMotionValue(0)

  useState(() => {
    const c = animate(mv, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() },
    })
    return c.stop
  })

  return <span ref={ref}>0</span>
}

// ── Create Clan Modal ──────────────────────────────────────────────────────

const CLAN_EMOJIS = ['⚡', '🔥', '🦁', '🦅', '🐺', '🌊', '💎', '🚀', '🌙', '⚔️', '🛡️', '👑']

function CreateClanModal({ onClose, onSubmit }: {
  onClose:  () => void
  onSubmit: (data: { name: string; emoji: string; schoolName: string; city: string }) => void
}) {
  const [name,       setName]       = useState('')
  const [emoji,      setEmoji]      = useState('⚡')
  const [schoolName, setSchoolName] = useState('')
  const [city,       setCity]       = useState('')
  const cities = ['Bakı', 'Gəncə', 'Sumqayıt', 'Mingəçevir', 'Lənkəran', 'Şirvan', 'Naxçıvan']

  const valid = name.trim().length >= 2 && schoolName.trim().length >= 2 && city

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-black text-xl mb-5">🛡️ Klan Yarat</h2>

        {/* Emoji picker */}
        <p className="text-[#9CA3AF] text-sm mb-2">Emblem seç</p>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {CLAN_EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="h-10 rounded-xl text-xl flex items-center justify-center transition-all"
              style={{
                background: emoji === e ? 'rgba(147,51,234,0.25)' : 'rgba(255,255,255,0.05)',
                border:     `1px solid ${emoji === e ? 'rgba(147,51,234,0.6)' : 'rgba(255,255,255,0.08)'}`,
                transform:  emoji === e ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Fields */}
        {[
          { label: 'Klan adı', value: name,       onChange: setName,       placeholder: 'Şimşəklər...' },
          { label: 'Məktəb',   value: schoolName, onChange: setSchoolName, placeholder: 'Bakı Məktəbi #47...' },
        ].map(f => (
          <div key={f.label} className="mb-3">
            <label className="text-[#9CA3AF] text-xs mb-1 block">{f.label}</label>
            <input
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border:     '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>
        ))}

        <div className="mb-5">
          <label className="text-[#9CA3AF] text-xs mb-1 block">Şəhər</label>
          <div className="grid grid-cols-3 gap-2">
            {cities.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className="py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: city === c ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
                  border:     `1px solid ${city === c ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color:      city === c ? '#C084FC' : '#9CA3AF',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10"
          >
            Ləğv et
          </button>
          <motion.button
            onClick={() => valid && onSubmit({ name, emoji, schoolName, city })}
            disabled={!valid}
            whileHover={valid ? { scale: 1.02 } : {}}
            whileTap={valid ? { scale: 0.97 } : {}}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
          >
            Yarat 🛡️
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onSearch }: {
  onCreate: () => void
  onSearch: () => void
}) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="text-8xl mb-6"
      >
        🤖
      </motion.div>
      <h2 className="text-white font-black text-2xl mb-2">Klanın yoxdur!</h2>
      <p className="text-[#9CA3AF] text-sm mb-2 max-w-xs">
        Hələ bir klana üzv deyilsən.
      </p>
      <p className="text-red-400 text-sm font-bold mb-8">
        ⚠️ Klan olmadan döyüşlər buraxılır!
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <motion.button
          onClick={onCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black text-white text-base"
          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 20px rgba(147,51,234,0.4)' }}
        >
          🛡️ Klan Yarat
        </motion.button>
        <motion.button
          onClick={onSearch}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          🔍 Klana Qoşul
        </motion.button>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────

type TabKey = 'members' | 'battles' | 'stats' | 'challenge'

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'members',   label: 'Üzvlər',    emoji: '👥' },
  { key: 'battles',   label: 'Döyüşlər',  emoji: '⚔️' },
  { key: 'stats',     label: 'Statistika', emoji: '📊' },
  { key: 'challenge', label: 'Meydan Oxu', emoji: '🥊' },
]

// ── Main ───────────────────────────────────────────────────────────────────

export default function ClanPage() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const user        = useSelector((s: RootState) => s.auth.user)
  const queryClient = useQueryClient()

  const [tab,          setTab]          = useState<TabKey>('members')
  const [showCreate,   setShowCreate]   = useState(false)
  const [showJoin,     setShowJoin]     = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeBattle, setActiveBattle] = useState<string | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: clan, isLoading: clanLoading } = useQuery<ClanData>({
    queryKey: ['clan', slug],
    queryFn:  () => api.get<{ data: ClanData }>(API_ROUTES.CLANS.BY_SLUG(slug!))
                      .then(r => r.data.data)
                      .catch(() => (slug ? MOCK_CLAN : null as unknown as ClanData)),
    enabled:  !!slug,
    staleTime: 1000 * 60 * 2,
  })

  const { data: members, isLoading: membersLoading } = useQuery<ClanMemberFull[]>({
    queryKey: ['clan', slug, 'members'],
    queryFn:  () => api.get<{ data: ClanMemberFull[] }>(API_ROUTES.CLANS.MEMBERS(slug!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_MEMBERS),
    enabled:  !!slug && tab === 'members',
    staleTime: 1000 * 60 * 2,
  })

  const { data: battles, isLoading: battlesLoading } = useQuery<BattleHistoryItem[]>({
    queryKey: ['clan', slug, 'battles'],
    queryFn:  () => api.get<{ data: BattleHistoryItem[] }>(API_ROUTES.CLANS.BATTLES(slug!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_BATTLES),
    enabled:  !!slug && tab === 'battles',
    staleTime: 1000 * 60,
  })

  const { data: stats, isLoading: statsLoading } = useQuery<ClanStats>({
    queryKey: ['clan', slug, 'stats'],
    queryFn:  () => api.get<{ data: ClanStats }>(API_ROUTES.CLANS.STATS(slug!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_STATS),
    enabled:  !!slug && tab === 'stats',
    staleTime: 1000 * 60 * 5,
  })

  const { data: searchResults, isFetching: searchLoading } = useQuery<ClanSearchResult[]>({
    queryKey: ['clan-search', searchQuery],
    queryFn:  () => api.get<{ data: ClanSearchResult[] }>(API_ROUTES.CLANS.SEARCH, { params: { search: searchQuery } })
                      .then(r => r.data.data)
                      .catch(() => MOCK_SEARCH.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))),
    enabled:  tab === 'challenge' && searchQuery.trim().length >= 2,
    staleTime: 1000 * 30,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(API_ROUTES.CLANS.JOIN(id)),
    onSuccess: () => { toast.success('Klana uğurla qoşuldun! 🎉'); queryClient.invalidateQueries({ queryKey: ['clan', slug] }) },
    onError:   () => toast.error('Klana qoşularkən xəta baş verdi.'),
  })

  const leaveMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.CLANS.LEAVE),
    onSuccess:  () => { toast.success('Klandan ayrıldın.'); navigate(APP_ROUTES.DASHBOARD.STUDENT) },
    onError:    () => toast.error('Xəta baş verdi.'),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; emoji: string; schoolName: string; city: string }) =>
      api.post<{ data: ClanData }>(API_ROUTES.CLANS.CREATE, data).then(r => r.data.data),
    onSuccess: (newClan: ClanData) => {
      toast.success('Klan yaradıldı! 🛡️')
      setShowCreate(false)
      navigate(APP_ROUTES.CLAN(newClan.slug))
    },
    onError: () => toast.error('Klan yaradıla bilmədi.'),
  })

  const challengeMutation = useMutation({
    mutationFn: ({ id, subject }: { id: string; subject: string }) =>
      api.post<{ data: { battleId: string } }>(API_ROUTES.CLANS.CHALLENGE(id), { subject }).then(r => r.data.data),
    onSuccess: (res: { battleId: string }) => {
      toast.success('Mübarizə dəvəti göndərildi! ⚔️')
      if (clan) navigate(APP_ROUTES.CLAN_BATTLE(clan.slug, res.battleId))
    },
    onError: () => toast.error('Dəvət göndərilə bilmədi.'),
  })

  // ── No slug = user has no clan ────────────────────────────────────────────

  if (!slug && !clanLoading) {
    return (
      <>
        <EmptyState onCreate={() => setShowCreate(true)} onSearch={() => setShowJoin(true)} />
        <AnimatePresence>
          {showCreate && (
            <CreateClanModal
              onClose={() => setShowCreate(false)}
              onSubmit={data => createMutation.mutate(data)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  if (clanLoading) {
    return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!clan) {
    return <EmptyState onCreate={() => setShowCreate(true)} onSearch={() => setShowJoin(true)} />
  }

  const c          = clan
  const memberList = members ?? MOCK_MEMBERS
  const battleList = battles ?? MOCK_BATTLES
  const clanStats  = stats   ?? MOCK_STATS

  const sortedMembers = [...memberList].sort((a, b) => b.weeklyXP - a.weeklyXP)
  const isMember = memberList.some(m => m.userId === user?._id)
  const isLeader = memberList.find(m => m.userId === user?._id)?.role === 'leader'
  const winRate  = Math.round((c.wins / Math.max(c.wins + c.losses, 1)) * 100)

  const battleBarData = battleList.slice(0, 10).map(b => ({
    name: b.opponentName.slice(0, 6),
    Biz:  b.ourScore,
    Rəqib: b.theirScore,
  }))

  // handle ongoing battle
  const ongoingBattle = battleList.find(b => b.result === 'ongoing')

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:   `linear-gradient(180deg, ${c.color}25 0%, transparent 100%)`,
          borderBottom: `1px solid ${c.color}25`,
          minHeight:    280,
        }}
      >
        <ClanParticles color={c.color} />

        <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-8">
          {/* Emblem + name */}
          <div className="flex flex-col items-center text-center mb-6">
            <ClanEmblemDisplay color={c.color} emoji={c.emblem ?? '⚡'} size={100} />

            <motion.h1
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-black mt-4 text-3xl"
              style={{
                background: `linear-gradient(135deg, ${c.color}, #FFD700)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {c.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[#9CA3AF] text-sm mt-1"
            >
              🏫 {c.schoolName} · 📍 {c.city} · ⚔️ {c.totalBattles} döyüş
            </motion.p>

            {/* Rank badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)' }}
            >
              <span className="text-lg">🏆</span>
              <span className="font-black text-[#FFD700] text-sm">Ölkədə {c.rank}-ci</span>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            {[
              { label: 'Üzv',        value: memberList.length, emoji: '👥' },
              { label: 'Ümumi XP',   value: <><XPNumber value={c.totalXP} /> XP</>,  emoji: '⭐' },
              { label: 'Qalibiyyət', value: `${winRate}%`,    emoji: '🏆' },
            ].map(s => (
              <div
                key={s.label}
                className="flex flex-col items-center p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${c.color}20` }}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="font-black text-white text-sm mt-1">{s.value}</span>
                <span className="text-[#9CA3AF] text-[10px]">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Həftəlik XP */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between mb-5 px-4 py-3 rounded-2xl"
            style={{ background: `${c.color}12`, border: `1px solid ${c.color}25` }}
          >
            <span className="text-[#9CA3AF] text-sm">⚡ Bu həftə</span>
            <span className="font-black text-white text-base">
              <XPNumber value={c.weeklyXP} /> XP
            </span>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex gap-3"
          >
            {!isMember ? (
              <motion.button
                onClick={() => joinMutation.mutate(c._id)}
                disabled={joinMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${c.color}, #6366F1)`, boxShadow: `0 4px 16px ${c.color}40` }}
              >
                {joinMutation.isPending ? 'Qoşulur...' : '➕ Klana Qoşul'}
              </motion.button>
            ) : (
              <>
                {isLeader && (
                  <motion.button
                    onClick={() => setTab('challenge')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }}
                  >
                    ⚔️ Döyüşə Çağır
                  </motion.button>
                )}
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="px-5 py-3.5 rounded-2xl font-bold text-red-400 text-sm border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                >
                  Ayrıl
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        {/* Tab bar */}
        <div className="relative flex gap-0 mb-6 border-b border-white/10">
          {TABS.map(t => {
            if (t.key === 'challenge' && !isLeader) return null
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors"
                style={{ color: active ? c.color : '#9CA3AF' }}
              >
                <span>{t.emoji}</span>
                <span className="hidden sm:block">{t.label}</span>
                {active && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: c.color }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Panels */}
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
              membersLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedMembers.map((m, i) => (
                    <MemberCard
                      key={m.studentId}
                      m={m}
                      rank={i + 1}
                      onChallenge={userId => navigate(`/competition/new?opponent=${userId}`)}
                    />
                  ))}
                </div>
              )
            )}

            {/* BATTLES */}
            {tab === 'battles' && (
              battlesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <div>
                  {/* Bar chart */}
                  <div
                    className="rounded-2xl p-4 mb-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-white font-bold text-sm mb-3">📊 Son 10 Döyüş — Xal Müqayisəsi</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={battleBarData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: `1px solid ${c.color}40`, borderRadius: 12, fontSize: 12 }}
                          labelStyle={{ color: '#9CA3AF' }}
                        />
                        <Bar dataKey="Biz"   fill={c.color}   radius={[4,4,0,0]} />
                        <Bar dataKey="Rəqib" fill="#374151" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Battle timeline */}
                  <div className="space-y-2">
                    {battleList.map(b => {
                      const isWin  = b.result === 'win'
                      const isOngoing = b.result === 'ongoing'
                      const color = isWin ? '#22C55E' : isOngoing ? '#EAB308' : '#EF4444'
                      const icon  = isWin ? '🏆' : isOngoing ? '⚔️' : '❌'
                      const d = b.endedAt ? new Date(b.endedAt) : new Date(b.startedAt)
                      const months = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avg','Sen','Okt','Noy','Dek']
                      const dateStr = `${d.getDate()} ${months[d.getMonth()]}`

                      return (
                        <motion.div
                          key={b._id}
                          whileHover={{ scale: 1.015 }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                          style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                          onClick={() => navigate(APP_ROUTES.CLAN_BATTLE(slug!, b._id))}
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: `${b.opponentColor}15`, border: `1px solid ${b.opponentColor}30` }}
                          >
                            {b.opponentEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{b.opponentName}</span>
                              {isOngoing && (
                                <motion.span
                                  animate={{ opacity: [1, 0.4, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgba(234,179,8,0.2)', color: '#EAB308' }}
                                >
                                  CANLI
                                </motion.span>
                              )}
                            </div>
                            <div className="text-[#9CA3AF] text-[11px]">{b.subject} · {b.format} · {dateStr}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-sm" style={{ color }}>
                              {icon} {b.ourScore} – {b.theirScore}
                            </div>
                            <div className="text-[#9CA3AF] text-[10px]">Detallar →</div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            )}

            {/* STATS */}
            {tab === 'stats' && (
              statsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Line chart */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-white font-bold text-sm mb-3">📈 Həftəlik XP Artımı</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={clanStats.weeklyXPHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: `1px solid ${c.color}40`, borderRadius: 12, fontSize: 12 }}
                          labelStyle={{ color: '#9CA3AF' }}
                          itemStyle={{ color: c.color }}
                        />
                        <Line type="monotone" dataKey="xp" stroke={c.color} strokeWidth={2.5} dot={{ fill: c.color, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart + highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <p className="text-white font-bold text-sm mb-2">🥧 XP Payı</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={clanStats.memberXPShare}
                            dataKey="xp"
                            nameKey="name"
                            cx="50%" cy="50%"
                            outerRadius={68}
                            innerRadius={36}
                          >
                            {clanStats.memberXPShare.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(v: string) => <span style={{ color: '#9CA3AF', fontSize: 11 }}>{v}</span>}
                          />
                          <Tooltip
                            contentStyle={{ background: '#111827', borderRadius: 12, fontSize: 12 }}
                            formatter={(v: number) => [`${v.toLocaleString()} XP`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-3">
                      {[
                        { icon: '📚', label: 'Ən güclü fənn', value: `${clanStats.strongestSubject} ${clanStats.strongestPct}%` },
                        { icon: '🔥', label: 'Ən aktiv üzv',  value: clanStats.mostActiveUser.name },
                        { icon: '🏆', label: 'Ən yaxşı nəticə', value: `${clanStats.bestBattleScore} xal` },
                        { icon: '📊', label: 'Qalibiyyət nisbəti', value: `${winRate}%` },
                      ].map(s => (
                        <div
                          key={s.label}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <div className="text-[#9CA3AF] text-[11px]">{s.label}</div>
                            <div className="text-white font-bold text-sm">{s.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* CHALLENGE (leader only) */}
            {tab === 'challenge' && (
              <div>
                {ongoingBattle && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl mb-5 cursor-pointer"
                    style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
                    onClick={() => navigate(APP_ROUTES.CLAN_BATTLE(slug!, ongoingBattle._id))}
                  >
                    <motion.span className="text-2xl" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>⚔️</motion.span>
                    <div>
                      <p className="text-[#EAB308] font-bold text-sm">Mövcud döyüş davam edir!</p>
                      <p className="text-[#9CA3AF] text-xs">vs. {ongoingBattle.opponentName} — Davam et →</p>
                    </div>
                  </motion.div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Klan axtar... (ən az 2 hərf)"
                    className="w-full px-4 py-3.5 pl-10 rounded-2xl text-white text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border:     '1px solid rgba(255,255,255,0.1)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${c.color}60` }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">🔍</span>
                </div>

                {/* Results */}
                {searchLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    ))}
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map(r => (
                      <motion.div
                        key={r._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `${r.color}15`, border: `1px solid ${r.color}30` }}
                        >
                          ⚡
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-sm">{r.name}</div>
                          <div className="text-[#9CA3AF] text-xs">{r.schoolName} · {r.city}</div>
                          <div className="text-[#9CA3AF] text-xs">#{r.rank} · {r.memberCount} üzv · {r.totalXP.toLocaleString()} XP</div>
                        </div>
                        <motion.button
                          onClick={() => {
                            setActiveBattle(r._id)
                            challengeMutation.mutate({ id: r._id, subject: 'Riyaziyyat' })
                          }}
                          disabled={challengeMutation.isPending && activeBattle === r._id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
                        >
                          {challengeMutation.isPending && activeBattle === r._id ? '...' : 'Meydan oxu'}
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searchLoading && searchResults?.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">🤷</div>
                    <p className="text-[#9CA3AF] text-sm">Heç bir klan tapılmadı.</p>
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-4">⚔️</div>
                    <p className="text-[#9CA3AF] text-sm">Rəqib klanın adını yazaraq mübarizəyə çağır.</p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateClanModal
            onClose={() => setShowCreate(false)}
            onSubmit={data => createMutation.mutate(data)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
