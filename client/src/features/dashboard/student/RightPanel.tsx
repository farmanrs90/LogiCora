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
  rating:      number
  totalEnrolled: number
}

function FeaturedCourseCard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data } = useQuery<FeaturedCourse | null>({
    queryKey: ['courses', 'featured'],
    queryFn:  () =>
      api.get<{ data: unknown }>(API_ROUTES.COURSES.FEATURED).then(r => {
        const d = r.data.data
        const c = (Array.isArray(d) ? d[0] : d) as
          | { _id: string; title: string; rating?: number; totalEnrolled?: number }
          | undefined
        if (!c) return null
        return {
          id:            c._id,
          title:         c.title,
          rating:        c.rating ?? 0,
          totalEnrolled: c.totalEnrolled ?? 0,
        } as FeaturedCourse
      }).catch(() => null),
    staleTime: 1000 * 60 * 10,
  })

  // Real seçilmiş kurs yoxdursa kartı göstərmə (saxta data YOX)
  if (!data) return null

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
        🎓
      </div>

      <div className="p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div>
          <p className="text-white font-bold text-sm leading-tight">{data.title}</p>
          <p className="text-[#9CA3AF] text-xs mt-0.5">Seçilmiş kurs</p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
          {data.rating > 0 && <span>⭐ {data.rating}</span>}
          <span>👥 {data.totalEnrolled.toLocaleString()} tələbə</span>
        </div>

        <motion.button
          onClick={() => navigate(`/courses/${data.id}`)}
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

// ── Leaderboard mini (real milli leaderboard) ──────────────────────────────

interface LeaderRow {
  rank:  number
  name:  string
  color: string
  xp:    number
}

const LEADER_PALETTE = ['#9333EA', '#06B6D4', '#3B82F6', '#EC4899', '#58CC02']
const rankMedal = ['🥇', '🥈', '🥉']

function LeaderboardMini() {
  const { data, isLoading } = useQuery<LeaderRow[]>({
    queryKey: ['leaderboard', 'national'],
    queryFn:  () =>
      api.get<{ data: Array<Record<string, unknown>> }>(API_ROUTES.GAMIFICATION.LEADERBOARD_NATIONAL)
        .then(r => {
          const list = r.data.data ?? []
          return list.slice(0, 5).map((g, i) => {
            const gg = g as { totalXP?: number; studentId?: { userId?: { name?: string; surname?: string } } }
            const u = gg.studentId?.userId
            return {
              rank:  i + 1,
              name:  [u?.name, u?.surname].filter(Boolean).join(' ') || 'Tələbə',
              color: LEADER_PALETTE[i % LEADER_PALETTE.length],
              xp:    gg.totalXP ?? 0,
            }
          })
        }),
    staleTime: 1000 * 60 * 2,
  })

  const rows = data ?? []

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
        <span className="text-[#9CA3AF] text-xs">Ümumi</span>
      </div>

      {isLoading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-[#9CA3AF] text-xs">Hələ sıralama yoxdur</div>
      ) : (
        <div className="p-2 space-y-0.5">
          {rows.map((row) => (
            <div key={row.rank} className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <span className="w-5 text-center text-sm">
                {row.rank <= 3 ? rankMedal[row.rank - 1] : `${row.rank}.`}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ backgroundColor: row.color }}
              >
                {row.name.charAt(0)}
              </div>
              <span className="flex-1 text-sm truncate text-[#9CA3AF]">{row.name}</span>
              <span className="text-xs font-bold text-[#9CA3AF]">{row.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      )}
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
