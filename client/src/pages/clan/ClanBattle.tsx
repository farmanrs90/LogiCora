import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useSocket } from '../../hooks/useSocket'
import type { RootState } from '../../app/store'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClanBattleData {
  _id:            string
  ourClan: {
    _id:   string
    name:  string
    slug:  string
    color: string
    emoji: string
  }
  theirClan: {
    _id:   string
    name:  string
    slug:  string
    color: string
    emoji: string
  }
  ourScore:      number
  theirScore:    number
  status:        'ongoing' | 'finished'
  subject:       string
  format:        'speed' | 'mixed' | 'subject'
  winner:        'ours' | 'theirs' | 'draw' | null
  ourMembers:    BattleMember[]
  theirMembers:  BattleMember[]
  startedAt:     string
  endedAt:       string | null
}

interface BattleMember {
  userId:      string
  name:        string
  avatarColor: string
  score:       number
  isActive:    boolean
}

// ── Mock ───────────────────────────────────────────────────────────────────

const MOCK_BATTLE: ClanBattleData = {
  _id: 'battle-1',
  ourClan:   { _id: 'c1', name: 'Şimşəklər', slug: 'simsekler', color: '#9333EA', emoji: '⚡' },
  theirClan: { _id: 'c2', name: 'Aslanlar',  slug: 'aslanlar',  color: '#EAB308', emoji: '🦁' },
  ourScore:   740,
  theirScore: 680,
  status:    'ongoing',
  subject:   'Riyaziyyat',
  format:    'speed',
  winner:    null,
  ourMembers: [
    { userId: 'u1', name: 'Aytən M.',  avatarColor: '#9333EA', score: 220, isActive: true  },
    { userId: 'u2', name: 'Kənan H.',  avatarColor: '#3B82F6', score: 185, isActive: true  },
    { userId: 'u3', name: 'Nigar Ə.',  avatarColor: '#06B6D4', score: 175, isActive: false },
    { userId: 'u4', name: 'Orxan T.',  avatarColor: '#F97316', score: 160, isActive: true  },
  ],
  theirMembers: [
    { userId: 'u5', name: 'Leyla K.',  avatarColor: '#EC4899', score: 200, isActive: true  },
    { userId: 'u6', name: 'Rauf N.',   avatarColor: '#22C55E', score: 190, isActive: true  },
    { userId: 'u7', name: 'Günel A.',  avatarColor: '#EAB308', score: 155, isActive: false },
    { userId: 'u8', name: 'Fərid M.',  avatarColor: '#8B5CF6', score: 135, isActive: true  },
  ],
  startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  endedAt:   null,
}

// ── Animated score ─────────────────────────────────────────────────────────

function AnimatedScore({ value, color }: { value: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv  = useMotionValue(0)

  useEffect(() => {
    const c = animate(mv, value, {
      duration: 0.6,
      ease: 'easeOut' as const,
      onUpdate: v => { if (ref.current) ref.current.textContent = String(Math.round(v)) },
    })
    return c.stop
  }, [value, mv])

  return (
    <span
      ref={ref}
      className="font-black tabular-nums"
      style={{ color, fontSize: 56, lineHeight: 1 }}
    >
      0
    </span>
  )
}

// ── Confetti ───────────────────────────────────────────────────────────────

function ConfettiPiece({ i }: { i: number }) {
  const angle  = (i / 28) * 2 * Math.PI
  const dist   = 140 + Math.random() * 120
  const colors = ['#FFD700', '#9333EA', '#3B82F6', '#22C55E', '#EC4899', '#F97316']
  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none"
      style={{
        backgroundColor: colors[i % colors.length],
        width: 7 + Math.random() * 5,
        height: 7 + Math.random() * 5,
        top: '40%', left: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 80, opacity: 0, rotate: Math.random() * 540 }}
      transition={{ duration: 1.6, ease: 'easeOut' as const }}
    />
  )
}

// ── Member row in live panel ───────────────────────────────────────────────

function LiveMemberRow({ m, isUs, maxScore }: { m: BattleMember; isUs: boolean; maxScore: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0"
          style={{ backgroundColor: m.avatarColor, opacity: m.isActive ? 1 : 0.4 }}
        >
          {m.name.charAt(0)}
        </div>
        {m.isActive && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-0.5">
          <span className="text-white text-xs font-bold truncate">{m.name}</span>
          <span className="text-white text-xs font-black ml-1">{m.score}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            animate={{ width: `${Math.min((m.score / Math.max(maxScore, 1)) * 100, 100)}%` }}
            transition={{ duration: 0.4 }}
            className="h-full rounded-full"
            style={{ background: isUs ? '#9333EA' : '#EAB308' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Battle end screen ──────────────────────────────────────────────────────

function BattleEndScreen({
  battle, onExit,
}: {
  battle:  ClanBattleData
  onExit:  () => void
}) {
  const isWin  = battle.winner === 'ours'
  const isDraw = battle.winner === 'draw'
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0D0D0D]">
      {/* Confetti */}
      {isWin && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
          <AnimatePresence>
            {showConfetti && Array.from({ length: 28 }).map((_, i) => <ConfettiPiece key={i} i={i} />)}
          </AnimatePresence>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="flex flex-col items-center gap-6 px-6 text-center max-w-sm"
      >
        {/* Result emoji */}
        <motion.div
          className="text-8xl"
          animate={isWin ? { rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {isWin ? '🏆' : isDraw ? '🤝' : '😔'}
        </motion.div>

        {/* Title */}
        <div>
          <h1
            className="font-black text-3xl mb-2"
            style={{
              background: isWin
                ? 'linear-gradient(135deg, #FFD700, #F97316)'
                : isDraw
                ? 'linear-gradient(135deg, #9CA3AF, #6B7280)'
                : 'linear-gradient(135deg, #EF4444, #DC2626)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {isWin ? 'Klan Qalibdir!' : isDraw ? 'Bərabər Nəticə!' : 'Növbəti Döyüşdə!'}
          </h1>
          <p className="text-[#9CA3AF] text-sm">
            {isWin
              ? `+500 Klan XP qazandınız! 🎉`
              : isDraw
              ? 'Hər iki klan yaxşı döyüşdü!'
              : 'Növbəti döyüşdə daha güclü olacaqsınız!'}
          </p>
        </div>

        {/* Final scores */}
        <div
          className="w-full flex items-center justify-around p-5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">{battle.ourClan.emoji}</div>
            <div className="font-black text-2xl" style={{ color: battle.ourClan.color }}>{battle.ourScore}</div>
            <div className="text-[#9CA3AF] text-xs">{battle.ourClan.name}</div>
          </div>
          <div className="text-[#9CA3AF] font-black text-lg">VS</div>
          <div className="text-center">
            <div className="text-2xl mb-1">{battle.theirClan.emoji}</div>
            <div className="font-black text-2xl" style={{ color: battle.theirClan.color }}>{battle.theirScore}</div>
            <div className="text-[#9CA3AF] text-xs">{battle.theirClan.name}</div>
          </div>
        </div>

        <motion.button
          onClick={onExit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }}
        >
          Klana Qayıt
        </motion.button>
      </motion.div>
    </div>
  )
}

// ── Format badge ───────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  speed:   '⚡ Sürət Yarışı',
  mixed:   '🌀 Qarışıq Format',
  subject: '📚 Fənn Yarışı',
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ClanBattle() {
  const { slug, battleId } = useParams<{ slug: string; battleId: string }>()
  const navigate           = useNavigate()
  const avatarColor        = useSelector((s: RootState) => s.theme.avatarColor)
  const user               = useSelector((s: RootState) => s.auth.user)

  // Live score state updated from socket
  const [ourScore,   setOurScore]   = useState(0)
  const [theirScore, setTheirScore] = useState(0)
  const [ourMembers,   setOurMembers]   = useState<BattleMember[]>([])
  const [theirMembers, setTheirMembers] = useState<BattleMember[]>([])
  const [status,     setStatus]     = useState<'ongoing' | 'finished'>('ongoing')
  const [winner,     setWinner]     = useState<'ours' | 'theirs' | 'draw' | null>(null)
  const [elapsed,    setElapsed]    = useState(0)
  const [intro,      setIntro]      = useState(true)

  // Socket
  const { socketRef, isConnected } = useSocket(battleId ?? null)

  // Fetch initial state
  const { data: battle, isLoading } = useQuery<ClanBattleData>({
    queryKey: ['clan-battle', battleId],
    queryFn:  () => api.get<{ data: ClanBattleData }>(API_ROUTES.CLANS.BATTLE(battleId!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_BATTLE),
    enabled:  !!battleId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!battle) return
    setOurScore(battle.ourScore)
    setTheirScore(battle.theirScore)
    setOurMembers(battle.ourMembers)
    setTheirMembers(battle.theirMembers)
    setStatus(battle.status)
    setWinner(battle.winner)
  }, [battle])

  // Socket listeners for live updates
  useEffect(() => {
    if (!isConnected || !socketRef.current) return
    const socket = socketRef.current

    socket.on('clan:battle:score', (data: {
      ourScore: number; theirScore: number
      ourMembers: BattleMember[]; theirMembers: BattleMember[]
    }) => {
      setOurScore(data.ourScore)
      setTheirScore(data.theirScore)
      setOurMembers(data.ourMembers)
      setTheirMembers(data.theirMembers)
    })

    socket.on('clan:battle:end', (data: { winner: 'ours' | 'theirs' | 'draw'; ourScore: number; theirScore: number }) => {
      setOurScore(data.ourScore)
      setTheirScore(data.theirScore)
      setWinner(data.winner)
      setStatus('finished')
      toast(data.winner === 'ours' ? '🏆 Klan qalibdir!' : data.winner === 'draw' ? '🤝 Bərabər!' : '😔 Məğlub oldunuz')
    })

    return () => {
      socket.off('clan:battle:score')
      socket.off('clan:battle:end')
    }
  }, [isConnected, socketRef])

  // Elapsed timer
  useEffect(() => {
    if (status !== 'ongoing') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  // Dismiss intro after 2.4 s
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 2400)
    return () => clearTimeout(t)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
          className="w-12 h-12 rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${avatarColor} ${avatarColor}30 ${avatarColor}30 ${avatarColor}30` }}
        />
      </div>
    )
  }

  const b        = battle ?? MOCK_BATTLE
  const maxScore = Math.max(ourScore, theirScore, 1)
  const mins     = Math.floor(elapsed / 60)
  const secs     = elapsed % 60
  const timeStr  = `${mins}:${String(secs).padStart(2, '0')}`

  const myScore = [...ourMembers].find(m => m.userId === user?._id)?.score ?? 0

  // Win on our side?
  const weLeading = ourScore >= theirScore

  // ── Intro animation ───────────────────────────────────────────────────
  if (intro) {
    return (
      <div className="fixed inset-0 bg-[#0D0D0D] flex items-center justify-center overflow-hidden z-50">
        <motion.div
          initial={{ x: '-60vw', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
          className="absolute left-1/4 -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: `${b.ourClan.color}25`, border: `2px solid ${b.ourClan.color}50`, boxShadow: `0 0 32px ${b.ourClan.color}40` }}
          >
            {b.ourClan.emoji}
          </div>
          <span className="font-black text-white text-lg text-center">{b.ourClan.name}</span>
        </motion.div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="z-10 font-black text-[#FFD700] text-3xl select-none"
          style={{ textShadow: '0 0 32px rgba(255,215,0,0.6)' }}
        >
          ⚔️
        </motion.div>

        <motion.div
          initial={{ x: '60vw', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
          className="absolute right-1/4 translate-x-1/2 flex flex-col items-center gap-3"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: `${b.theirClan.color}25`, border: `2px solid ${b.theirClan.color}50`, boxShadow: `0 0 32px ${b.theirClan.color}40` }}
          >
            {b.theirClan.emoji}
          </div>
          <span className="font-black text-white text-lg text-center">{b.theirClan.name}</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="absolute bottom-24 font-black text-2xl"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ⚔️ KLAN DÖYÜŞÜ ⚔️
        </motion.p>
      </div>
    )
  }

  // ── Battle ended ──────────────────────────────────────────────────────
  if (status === 'finished') {
    return (
      <BattleEndScreen
        battle={{ ...b, ourScore, theirScore, winner }}
        onExit={() => navigate(APP_ROUTES.CLAN(slug!))}
      />
    )
  }

  // ── Live battle UI ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button
          onClick={() => navigate(APP_ROUTES.CLAN(slug!))}
          className="text-[#9CA3AF] text-sm font-bold hover:text-white transition-colors"
        >
          ← Geri
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-lg font-bold"
            style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}>
            {FORMAT_LABELS[b.format] ?? b.format}
          </span>
          <span className="text-[#9CA3AF] text-xs">📚 {b.subject}</span>
        </div>
        <div className="font-mono text-white text-sm font-bold">{timeStr}</div>
      </div>

      {/* Score panel */}
      <div
        className="px-4 py-6"
        style={{ background: `linear-gradient(180deg, rgba(147,51,234,0.08) 0%, transparent 100%)` }}
      >
        <div className="max-w-lg mx-auto">
          {/* Clan names */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{b.ourClan.emoji}</span>
              <span className="font-bold text-white text-sm">{b.ourClan.name}</span>
              {weLeading && <span className="text-xs text-green-400">▲</span>}
            </div>
            <div className="text-[#9CA3AF] font-black text-sm">VS</div>
            <div className="flex items-center gap-2">
              {!weLeading && <span className="text-xs text-red-400">▲</span>}
              <span className="font-bold text-white text-sm">{b.theirClan.name}</span>
              <span className="text-2xl">{b.theirClan.emoji}</span>
            </div>
          </div>

          {/* Big scores */}
          <div className="flex items-center justify-around mb-5">
            <AnimatedScore value={ourScore} color={b.ourClan.color} />
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-400"
              />
              <span className="text-[#9CA3AF] text-xs font-bold">CANLI</span>
            </div>
            <AnimatedScore value={theirScore} color={b.theirClan.color} />
          </div>

          {/* Progress bar comparison */}
          <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              animate={{ width: `${(ourScore / (ourScore + theirScore || 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${b.ourClan.color}, ${b.ourClan.color}bb)` }}
            />
            <motion.div
              animate={{ width: `${(theirScore / (ourScore + theirScore || 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${b.theirClan.color}bb, ${b.theirClan.color})` }}
            />
          </div>

          {/* My score */}
          <div className="flex items-center justify-center mt-4">
            <div
              className="px-4 py-2 rounded-xl"
              style={{ background: `${avatarColor}15`, border: `1px solid ${avatarColor}30` }}
            >
              <span className="text-[#9CA3AF] text-xs">Sənin xalın: </span>
              <span className="font-black text-sm" style={{ color: avatarColor }}>{myScore} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Member panels */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-4">

          {/* Our members */}
          <div
            className="rounded-2xl p-4"
            style={{ background: `${b.ourClan.color}08`, border: `1px solid ${b.ourClan.color}25` }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-base">{b.ourClan.emoji}</span>
              <span className="font-bold text-white text-xs">{b.ourClan.name}</span>
            </div>
            {ourMembers.map(m => (
              <LiveMemberRow key={m.userId} m={m} isUs={true} maxScore={maxScore} />
            ))}
          </div>

          {/* Their members */}
          <div
            className="rounded-2xl p-4"
            style={{ background: `${b.theirClan.color}08`, border: `1px solid ${b.theirClan.color}25` }}
          >
            <div className="flex items-center gap-1.5 mb-3 justify-end">
              <span className="font-bold text-white text-xs">{b.theirClan.name}</span>
              <span className="text-base">{b.theirClan.emoji}</span>
            </div>
            {theirMembers.map(m => (
              <LiveMemberRow key={m.userId} m={m} isUs={false} maxScore={maxScore} />
            ))}
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: isConnected ? '#22C55E' : '#EF4444' }}
          />
          <span className="text-[#9CA3AF] text-xs">
            {isConnected ? 'Real-time bağlantı aktiv' : 'Bağlantı qurulur...'}
          </span>
        </div>
      </div>
    </div>
  )
}
