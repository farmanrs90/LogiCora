import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import api from '../../../lib/api'
import type { RootState } from '../../../app/store'

interface MyClan {
  name:       string
  badge:      string
  rank:       number
  totalXP:    number
  memberCount: number
  weeklyXP:   number
}

export default function ClanCard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data, isLoading } = useQuery<MyClan | null>({
    queryKey: ['clans', 'my'],
    queryFn:  () =>
      api.get<{ data: MyClan | null }>('/clans/my').then(r => r.data.data).catch(() => null),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-4 w-24 bg-[rgba(255,255,255,0.08)] rounded mb-4" />
        <div className="h-14 w-full bg-[rgba(255,255,255,0.06)] rounded mb-3" />
        <div className="h-9 w-full bg-[rgba(255,255,255,0.06)] rounded" />
      </div>
    )
  }

  // No clan
  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-white font-bold text-sm">Klanım 🛡️</span>
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <span className="text-3xl">🛡️</span>
          <p className="text-[#9CA3AF] text-xs text-center">Hələ klana qoşulmamısınız</p>
        </div>
        <motion.button
          onClick={() => navigate('/clan/me')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
            boxShadow:  `0 4px 16px ${avatarColor}40`,
          }}
        >
          Klana qoşul
        </motion.button>
      </motion.div>
    )
  }

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const rankColor  = data.rank <= 3 ? rankColors[data.rank - 1] : avatarColor

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: `${avatarColor}08`,
        border:     `1px solid ${avatarColor}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">Klanım 🛡️</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-lg"
          style={{ backgroundColor: `${rankColor}20`, color: rankColor }}
        >
          #{data.rank}
        </span>
      </div>

      {/* Clan info */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{data.badge}</span>
        <div>
          <p className="text-white font-semibold text-sm">{data.name}</p>
          <p className="text-[#9CA3AF] text-xs">{data.memberCount} üzv · {data.totalXP.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Weekly XP */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#9CA3AF]">Bu həftə</span>
        <span className="font-bold" style={{ color: avatarColor }}>+{data.weeklyXP} XP</span>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => navigate('/clan/me')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        Klana bax →
      </motion.button>
    </motion.div>
  )
}
