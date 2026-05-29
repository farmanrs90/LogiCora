import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import api from '../../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../../constants'
import type { RootState } from '../../../app/store'

interface DailyStatus {
  completed:     boolean
  answeredCount: number
  totalCount:    number
  streak:        number
  xpEarned:      number
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="h-4 w-36 bg-[rgba(255,255,255,0.08)] rounded mb-4" />
      <div className="h-3 w-24 bg-[rgba(255,255,255,0.06)] rounded mb-3" />
      <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded mb-4" />
      <div className="h-9 w-full bg-[rgba(255,255,255,0.06)] rounded" />
    </div>
  )
}

export default function DailyCard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data, isLoading } = useQuery<DailyStatus>({
    queryKey:  ['daily', 'status'],
    queryFn:   () => api.get<{ data: DailyStatus }>(API_ROUTES.DAILY.STATUS).then(r => r.data.data),
    staleTime: 1000 * 60,
  })

  if (isLoading) return <SkeletonCard />

  // Data yoxdursa real boş hal (saxta data YOX)
  const status: DailyStatus = data ?? {
    completed: false, answeredCount: 0, totalCount: 5, streak: 0, xpEarned: 0,
  }

  const pct = status.totalCount > 0
    ? Math.round((status.answeredCount / status.totalCount) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background:  status.completed ? `${avatarColor}0D` : 'rgba(255,255,255,0.04)',
        border:      `1px solid ${status.completed ? `${avatarColor}40` : 'rgba(255,255,255,0.07)'}`,
        boxShadow:   status.completed ? `0 0 24px ${avatarColor}20` : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">Bu günün tapşırığı 🎯</span>
        {/* Streak flame */}
        <div className="flex items-center gap-1">
          <motion.span
            className="text-base"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            🔥
          </motion.span>
          <span className="text-xs font-bold" style={{ color: '#F97316' }}>
            {status.streak} gün
          </span>
        </div>
      </div>

      {/* Progress text */}
      <div className="flex items-center justify-between">
        <span className="text-[#9CA3AF] text-xs">
          {status.answeredCount}/{status.totalCount} sual tamamlandı
        </span>
        {status.completed && status.xpEarned > 0 && (
          <span className="text-xs font-bold" style={{ color: avatarColor }}>
            +{status.xpEarned} XP
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: status.completed ? '#58CC02' : avatarColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' as const }}
        />
      </div>

      {/* CTA */}
      {status.completed ? (
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <span className="text-[#58CC02] text-sm font-medium">Sabah yeni suallar!</span>
        </div>
      ) : (
        <motion.button
          onClick={() => navigate(APP_ROUTES.DAILY)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-shadow"
          style={{
            background:  `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
            boxShadow:   `0 4px 16px ${avatarColor}40`,
          }}
        >
          {status.answeredCount > 0 ? 'Davam et →' : 'Başla →'}
        </motion.button>
      )}
    </motion.div>
  )
}
