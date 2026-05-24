import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../../constants'
import type { RootState } from '../../../app/store'

// ── Weekly Mystery Countdown ──────────────────────────────────────────────

function getNextSunday(): Date {
  const d = new Date()
  const day = d.getDay()           // 0=Sun
  const daysUntil = day === 0 ? 7 : 7 - day
  d.setDate(d.getDate() + daysUntil)
  d.setHours(23, 59, 59, 0)
  return d
}

function useMysteryCountdown() {
  const target = getNextSunday().getTime()
  const [diff, setDiff] = useState(Math.max(0, target - Date.now()))

  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, target - Date.now())), 1000)
    return () => clearInterval(id)
  }, [target])

  const days = Math.floor(diff / 86_400_000)
  const h    = Math.floor((diff % 86_400_000) / 3_600_000)
  const m    = Math.floor((diff % 3_600_000) / 60_000)
  const s    = Math.floor((diff % 60_000) / 1000)
  return { days, h, m, s }
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white tabular-nums"
        style={{ background: 'rgba(147,51,234,0.18)', border: '1px solid rgba(147,51,234,0.3)' }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[9px] text-[#9CA3AF]">{label}</span>
    </div>
  )
}

function MysteryCountdown() {
  const navigate = useNavigate()
  const { days, h, m, s } = useMysteryCountdown()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background:   'linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(59,130,246,0.08) 100%)',
        border:       '1px solid rgba(147,51,234,0.25)',
        boxShadow:    '0 0 32px rgba(147,51,234,0.15)',
      }}
    >
      <div className="flex items-center gap-2">
        <motion.span
          className="text-xl"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🔮
        </motion.span>
        <span className="text-white font-bold text-sm">Həftənin Sirri</span>
      </div>

      <p className="text-[#9CA3AF] text-xs leading-relaxed">
        Həftəlik gizli tapşırıq — yalnız ən çalışqan tələbələr üçün. Açılmasına qalıb:
      </p>

      {/* Countdown boxes */}
      <div className="flex items-center justify-center gap-2">
        <CountUnit value={days} label="gün" />
        <span className="text-[#9333EA] font-black text-lg mb-4">:</span>
        <CountUnit value={h} label="saat" />
        <span className="text-[#9333EA] font-black text-lg mb-4">:</span>
        <CountUnit value={m} label="dəq" />
        <span className="text-[#9333EA] font-black text-lg mb-4">:</span>
        <CountUnit value={s} label="san" />
      </div>

      <motion.button
        onClick={() => navigate(APP_ROUTES.WEEKLY_MYSTERY)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
        style={{
          background: 'linear-gradient(135deg, #9333EA, #7C3AED)',
          boxShadow:  '0 4px 16px rgba(147,51,234,0.4)',
        }}
      >
        İpucu al →
      </motion.button>
    </motion.div>
  )
}

// ── Featured Course ───────────────────────────────────────────────────────

interface FeaturedCourse {
  id:          string
  title:       string
  instructor:  string
  thumbnail:   string
  rating:      number
  lessonCount: number
  xpReward:   number
}

function FeaturedCourseCard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data } = useQuery<FeaturedCourse | null>({
    queryKey: ['courses', 'featured'],
    queryFn:  () =>
      api.get<{ data: FeaturedCourse }>(API_ROUTES.COURSES.FEATURED).then(r => r.data.data).catch(() => null),
    staleTime: 1000 * 60 * 10,
  })

  // Fallback mock course
  const course: FeaturedCourse = data ?? {
    id:          'python-basics',
    title:       'Python ilə Proqramlaşdırma',
    instructor:  'Elnur Həsənov',
    thumbnail:   '🐍',
    rating:      4.9,
    lessonCount: 32,
    xpReward:    800,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Thumbnail */}
      <div
        className="h-24 flex items-center justify-center text-5xl"
        style={{ background: `linear-gradient(135deg, ${avatarColor}20, ${avatarColor}08)` }}
      >
        {course.thumbnail}
      </div>

      <div className="p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div>
          <p className="text-white font-bold text-sm leading-tight">{course.title}</p>
          <p className="text-[#9CA3AF] text-xs mt-0.5">{course.instructor}</p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
          <span>⭐ {course.rating}</span>
          <span>📚 {course.lessonCount} dərs</span>
          <span className="font-bold" style={{ color: avatarColor }}>+{course.xpReward} XP</span>
        </div>

        <motion.button
          onClick={() => navigate(`/courses/${course.id}`)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-xl text-xs font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
            boxShadow:  `0 4px 12px ${avatarColor}40`,
          }}
        >
          Kursa bax →
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Leaderboard mini ─────────────────────────────────────────────────────

interface LeaderRow {
  rank:  number
  name:  string
  color: string
  xp:    number
}

const MOCK_LEADERS: LeaderRow[] = [
  { rank: 1, name: 'Aytən M.',  color: '#9333EA', xp: 4820 },
  { rank: 2, name: 'Nigar Ə.',  color: '#06B6D4', xp: 4210 },
  { rank: 3, name: 'Kənan H.',  color: '#3B82F6', xp: 3990 },
  { rank: 4, name: 'Leyla K.',  color: '#EC4899', xp: 3540 },
  { rank: 5, name: 'Siz',       color: '#58CC02', xp: 3200 },
]

const rankMedal = ['🥇', '🥈', '🥉']

function LeaderboardMini() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
        <span className="text-white font-bold text-sm">Liderlik Cədvəli 🏅</span>
        <span className="text-[#9CA3AF] text-xs">Bu həftə</span>
      </div>

      <div className="p-2 space-y-0.5">
        {MOCK_LEADERS.map((row) => (
          <div
            key={row.rank}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${row.name === 'Siz' ? 'bg-[rgba(255,255,255,0.06)]' : ''}`}
          >
            <span className="w-5 text-center text-sm">
              {row.rank <= 3 ? rankMedal[row.rank - 1] : `${row.rank}.`}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ backgroundColor: row.color }}
            >
              {row.name.charAt(0)}
            </div>
            <span className={`flex-1 text-sm truncate ${row.name === 'Siz' ? 'text-white font-bold' : 'text-[#9CA3AF]'}`}>
              {row.name}
            </span>
            <span className="text-xs font-bold text-[#9CA3AF]">{row.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── RightPanel ───────────────────────────────────────────────────────────

export default function RightPanel() {
  return (
    <div className="flex flex-col gap-5">
      <MysteryCountdown />
      <FeaturedCourseCard />
      <LeaderboardMini />
    </div>
  )
}
