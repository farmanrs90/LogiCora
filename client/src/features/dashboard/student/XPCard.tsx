import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import api from '../../../lib/api'
import { API_ROUTES } from '../../../constants'
import type { RootState } from '../../../app/store'
import type { GamificationProfile } from '../../../types'

const leagueColor: Record<string, string> = {
  bronze:   '#CD7F32',
  silver:   '#C0C0C0',
  gold:     '#FFD700',
  platinum: '#E5E4E2',
  diamond:  '#B9F2FF',
}

const leagueLabel: Record<string, string> = {
  bronze:   'Bürünc',
  silver:   'Gümüş',
  gold:     'Qızıl',
  platinum: 'Platin',
  diamond:  'Brilyant',
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="h-4 w-28 bg-[rgba(255,255,255,0.08)] rounded mb-4" />
      <div className="flex items-end gap-2 mb-3">
        <div className="h-8 w-16 bg-[rgba(255,255,255,0.08)] rounded" />
        <div className="h-4 w-12 bg-[rgba(255,255,255,0.06)] rounded mb-1" />
      </div>
      <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded" />
    </div>
  )
}

export default function XPCard() {
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data: gp, isLoading } = useQuery<GamificationProfile>({
    queryKey:  ['gamification', 'me'],
    queryFn:   () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then(r => r.data.data),
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) return <SkeletonCard />

  const profile = gp ?? { level: 1, totalXP: 0, leagueTier: 'bronze', gems: 0, streak: 0 } as GamificationProfile

  const xpPerLevel = profile.level * 200
  const xpInLevel  = profile.totalXP % xpPerLevel
  const xpPct      = Math.min((xpInLevel / xpPerLevel) * 100, 100)
  const xpToNext   = xpPerLevel - xpInLevel
  const lColor     = leagueColor[profile.leagueTier] ?? '#CD7F32'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">Səviyyə & XP ⭐</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-lg capitalize"
          style={{ backgroundColor: `${lColor}20`, color: lColor }}
        >
          {leagueLabel[profile.leagueTier] ?? profile.leagueTier}
        </span>
      </div>

      {/* Level display */}
      <div className="flex items-end gap-3">
        <motion.span
          className="font-black leading-none"
          style={{ fontSize: 40, color: avatarColor }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {profile.level}
        </motion.span>
        <div className="mb-1">
          <p className="text-white text-sm font-semibold">Səviyyə</p>
          <p className="text-[#9CA3AF] text-xs">{profile.totalXP.toLocaleString()} XP</p>
        </div>
        {/* Gems */}
        <div className="ml-auto flex items-center gap-1.5 mb-1">
          <span className="text-base">💎</span>
          <span className="text-sm font-bold text-[#06B6D4]">{profile.gems}</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-1.5">
        <div className="h-2.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: avatarColor }}
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[#9CA3AF] text-[10px] text-right">
          Növbəti səviyyə üçün {xpToNext} XP
        </p>
      </div>
    </motion.div>
  )
}
