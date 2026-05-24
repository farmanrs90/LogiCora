import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import type { RootState } from '../../../app/store'

interface ActiveCompetition {
  id:         string
  title:      string
  subject:    string
  startsAt:   string
  playerCount: number
  maxPlayers:  number
}

function useCountdown(target: string | undefined) {
  const [diff, setDiff] = useState(0)

  useEffect(() => {
    if (!target) return
    const tick = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  return { h, m, s, started: diff === 0 }
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-black text-xl text-white leading-none tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] text-[#9CA3AF] mt-0.5">{label}</span>
    </div>
  )
}

export default function CompetitionCard() {
  const navigate    = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data, isLoading } = useQuery<ActiveCompetition | null>({
    queryKey:  ['competitions', 'active'],
    queryFn:   () =>
      api.get<{ data: ActiveCompetition | null }>('/competitions/active').then(r => r.data.data).catch(() => null),
    staleTime: 1000 * 30,
  })

  const { h, m, s, started } = useCountdown(data?.startsAt)

  if (isLoading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-4 w-32 bg-[rgba(255,255,255,0.08)] rounded mb-4" />
        <div className="h-12 w-full bg-[rgba(255,255,255,0.06)] rounded mb-3" />
        <div className="h-9 w-full bg-[rgba(255,255,255,0.06)] rounded" />
      </div>
    )
  }

  // No active competition
  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span className="text-white font-bold text-sm">Yarışlar ⚔️</span>
        <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
          <span className="text-3xl">⚔️</span>
          <p className="text-[#9CA3AF] text-xs text-center">Aktiv yarış yoxdur</p>
        </div>
        <motion.button
          onClick={() => navigate('/competition')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Yarış axtar
        </motion.button>
      </motion.div>
    )
  }

  const fillPct = Math.round((data.playerCount / data.maxPlayers) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: 'rgba(239,68,68,0.06)',
        border:     '1px solid rgba(239,68,68,0.25)',
        boxShadow:  '0 0 24px rgba(239,68,68,0.12)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">Gələn Yarış ⚔️</span>
        <motion.span
          className="w-2 h-2 rounded-full bg-[#EF4444]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>

      {/* Competition info */}
      <div>
        <p className="text-white font-semibold text-sm leading-tight">{data.title}</p>
        <p className="text-[#9CA3AF] text-xs mt-0.5">{data.subject}</p>
      </div>

      {/* Countdown */}
      {!started ? (
        <div className="flex items-center gap-3 justify-center">
          <TimeBox value={h} label="saat" />
          <span className="text-[#EF4444] font-black text-lg">:</span>
          <TimeBox value={m} label="dəq" />
          <span className="text-[#EF4444] font-black text-lg">:</span>
          <TimeBox value={s} label="san" />
        </div>
      ) : (
        <p className="text-[#EF4444] font-bold text-sm text-center">Yarış başladı!</p>
      )}

      {/* Player fill bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-[#9CA3AF]">
          <span>{data.playerCount} oyunçu</span>
          <span>{data.maxPlayers} max</span>
        </div>
        <div className="h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#EF4444] transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => navigate(`/competition/${data.id}/lobby`)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
      >
        Qoşul →
      </motion.button>
    </motion.div>
  )
}
