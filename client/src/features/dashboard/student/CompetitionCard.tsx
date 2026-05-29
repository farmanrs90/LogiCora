import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/api'

interface ActiveCompetition {
  id:          string
  title:       string
  status:      string
  playerCount: number
}

export default function CompetitionCard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<ActiveCompetition | null>({
    queryKey:  ['competitions', 'active'],
    queryFn:   () =>
      api.get<{ data: Array<Record<string, unknown>> }>('/competitions/active').then(r => {
        const list = r.data.data ?? []
        if (list.length === 0) return null
        const c = list[0] as {
          _id: string; title: string; status: string; participants?: unknown[]
        }
        return {
          id:          c._id,
          title:       c.title,
          status:      c.status,
          playerCount: c.participants?.length ?? 0,
        } as ActiveCompetition
      }),
    staleTime: 1000 * 30,
  })

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

  // Aktiv yarış yoxdur
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

  const statusLabel = data.status === 'active' ? 'Davam edir' : 'İştirakçı yığılır'

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
        <span className="text-white font-bold text-sm">Aktiv Yarış ⚔️</span>
        <motion.span
          className="w-2 h-2 rounded-full bg-[#EF4444]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>

      {/* Competition info */}
      <div>
        <p className="text-white font-semibold text-sm leading-tight">{data.title}</p>
        <p className="text-[#9CA3AF] text-xs mt-0.5">{statusLabel}</p>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
        <span className="text-base">👥</span>
        <span>{data.playerCount} iştirakçı</span>
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
