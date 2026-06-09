import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { RootState }         from '../../app/store'
import type { CompetitionResults, Participant } from '../../types'

// ── Mock results ──────────────────────────────────────────────────────────

const MOCK_RESULTS: CompetitionResults = {
  competitionId: 'mock-comp-1',
  title:         'Riyaziyyat Müsabiqəsi',
  subject:       'Riyaziyyat',
  participants: [
    { userId: 'u1', name: 'Aytən M.',  avatarColor: '#9333EA', score: 850, rank: 1, correctCount: 9, wrongCount: 1, avgResponseTime: 3.2 },
    { userId: 'u2', name: 'Kənan H.',  avatarColor: '#3B82F6', score: 720, rank: 2, correctCount: 8, wrongCount: 2, avgResponseTime: 4.1 },
    { userId: 'u3', name: 'Nigar Ə.',  avatarColor: '#06B6D4', score: 650, rank: 3, correctCount: 7, wrongCount: 3, avgResponseTime: 5.0 },
    { userId: 'u4', name: 'Siz',        avatarColor: '#58CC02', score: 580, rank: 4, correctCount: 6, wrongCount: 4, avgResponseTime: 5.5 },
  ],
  myResult: { rank: 4, score: 580, xpEarned: 120, correctCount: 6, wrongCount: 4, avgResponseTime: 5.5 },
  isClanBattle: false,
}

// ── Confetti ──────────────────────────────────────────────────────────────

function ConfettiPiece({ i }: { i: number }) {
  const angle  = (i / 30) * 2 * Math.PI
  const dist   = 150 + Math.random() * 100
  const colors = ['#FFD700', '#9333EA', '#3B82F6', '#EF4444', '#22C55E', '#EC4899', '#F97316']
  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none"
      style={{
        backgroundColor: colors[i % colors.length],
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        top: '40%', left: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 60, opacity: 0, rotate: Math.random() * 540 }}
      transition={{ duration: 1.4, ease: 'easeOut' as const }}
    />
  )
}

// ── XP count-up ───────────────────────────────────────────────────────────

function XPCountUp({ target }: { target: number }) {
  const count = useMotionValue(0)
  const ref   = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.8,
      ease: 'easeOut' as const,
      onUpdate: v => { if (ref.current) ref.current.textContent = String(Math.round(v)) },
    })
    return controls.stop
  }, [target, count])

  return <span ref={ref}>0</span>
}

// ── Podium block ──────────────────────────────────────────────────────────

function PodiumBlock({
  p, position, delay,
}: {
  p:        Participant
  position: 1 | 2 | 3
  delay:    number
}) {
  const heights = { 1: 100, 2: 72, 3: 56 }
  const medals  = { 1: '🥇', 2: '🥈', 3: '🥉' }
  const h       = heights[position]

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay }}
      className="flex flex-col items-center gap-2"
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className="rounded-full flex items-center justify-center font-black text-white shadow-lg"
          style={{
            width:           position === 1 ? 64 : 52,
            height:          position === 1 ? 64 : 52,
            backgroundColor: p.avatarColor,
            fontSize:        position === 1 ? 24 : 18,
            boxShadow:       `0 0 24px ${p.avatarColor}60`,
          }}
        >
          {(p.name?.charAt(0) ?? '?').toUpperCase()}
        </div>
        <span className="absolute -top-3 -right-1 text-xl">{medals[position]}</span>

        {position === 1 && (
          <motion.div
            className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            👑
          </motion.div>
        )}
      </div>

      <p className="text-white font-bold text-xs text-center max-w-[72px] truncate">{p.name}</p>
      <p className="text-[#9CA3AF] text-[10px]">{p.score} xal</p>

      {/* Podium base */}
      <div
        className="w-20 rounded-t-lg flex items-center justify-center"
        style={{
          height:          h,
          background:      position === 1
            ? 'linear-gradient(180deg, #FFD70040, #FFD70015)'
            : 'rgba(255,255,255,0.06)',
          border:          `1px solid ${position === 1 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderBottom:    'none',
        }}
      >
        <span className="text-[#9CA3AF] font-black text-2xl opacity-30">{position}</span>
      </div>
    </motion.div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────

function Stat({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl">{emoji}</span>
      <span className="font-black text-white text-lg" style={color ? { color } : {}}>{value}</span>
      <span className="text-[#9CA3AF] text-[10px] text-center">{label}</span>
    </div>
  )
}

// ── Main Result ───────────────────────────────────────────────────────────

export default function CompetitionResult() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const { data, isLoading } = useQuery<CompetitionResults>({
    queryKey: ['competition', id, 'results'],
    queryFn:  () => api.get<{ data: CompetitionResults }>(API_ROUTES.COMPETITIONS.RESULTS(id!))
                       .then(r => r.data.data)
                       .catch(() => MOCK_RESULTS),
    enabled:  !!id,
    staleTime: 1000 * 60 * 5,
  })

  const results = data ?? MOCK_RESULTS
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2000)
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

  const top3     = results.participants.slice(0, 3)
  const first    = top3.find(p => p.rank === 1)
  const second   = top3.find(p => p.rank === 2)
  const third    = top3.find(p => p.rank === 3)
  const { myResult } = results
  const isHost = !!results.isHost

  const rankLabel = myResult.rank === 1 ? '🥇 Birinci!' : myResult.rank === 2 ? '🥈 İkinci!' : myResult.rank === 3 ? '🥉 Üçüncü!' : `${myResult.rank}-ci yer`

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-50">
        <AnimatePresence>
          {showConfetti && [...Array(30)].map((_, i) => <ConfettiPiece key={i} i={i} />)}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-8 max-w-lg mx-auto w-full">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.span className="text-4xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>🤖</motion.span>
            <motion.span className="text-4xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 }}>🧙‍♀️</motion.span>
          </div>
          <h1
            className="font-black text-3xl"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #F97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Mərhəba, qaliblər!
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{results.title}</p>
        </motion.div>

        {/* Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-end justify-center gap-3 w-full mt-8"
        >
          {second && <PodiumBlock p={second} position={2} delay={0.5} />}
          {first  && <PodiumBlock p={first}  position={1} delay={0.2} />}
          {third  && <PodiumBlock p={third}  position={3} delay={0.7} />}
        </motion.div>

        {/* My result (tələbə) və ya yekun standings (host) */}
        {!isHost ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full rounded-2xl p-5"
            style={{
              background: `${avatarColor}0D`,
              border:     `1px solid ${avatarColor}30`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-sm">Sənin nəticən</p>
              <span className="font-bold text-sm" style={{ color: avatarColor }}>{rankLabel}</span>
            </div>

            {/* XP */}
            <div className="flex flex-col items-center mb-4">
              <span className="font-black" style={{ fontSize: 48, color: '#EAB308', lineHeight: 1 }}>
                +<XPCountUp target={myResult.xpEarned} />
              </span>
              <span className="text-[#9CA3AF] text-xs">XP qazandın</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Stat emoji="✅" label="Düzgün"      value={myResult.correctCount}              color="#22C55E" />
              <Stat emoji="❌" label="Səhv"         value={myResult.wrongCount}               color="#EF4444" />
              <Stat emoji="⚡" label="Ort. vaxt"   value={`${myResult.avgResponseTime.toFixed(1)}s`} />
              <Stat emoji="🏆" label="Xal"          value={myResult.score}                    color={avatarColor} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full rounded-2xl p-5"
            style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.25)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-sm">Yarış yekunu</p>
              <span className="text-xs font-black px-2 py-1 rounded-md" style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}>HOST</span>
            </div>
            <p className="text-[#9CA3AF] text-xs mb-3">{results.participants.length} iştirakçı · Qalib: {results.participants[0]?.name ?? '—'}</p>
            <div className="flex flex-col gap-2">
              {results.participants.map((p, i) => (
                <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="w-6 text-center font-black text-[#9CA3AF]">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0" style={{ backgroundColor: p.avatarColor }}>{p.name?.charAt(0) ?? '?'}</div>
                  <span className="flex-1 text-sm font-semibold text-white truncate">{p.name}</span>
                  <span className="text-xs text-[#9CA3AF]">✅{p.correctCount}</span>
                  <span className="text-xs font-bold text-white w-10 text-right">{p.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Badge */}
        <AnimatePresence>
          {myResult.badge && (
            <motion.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl w-full"
              style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
            >
              <span className="text-4xl">{myResult.badge.emoji}</span>
              <span className="text-white font-bold text-sm">{myResult.badge.name}</span>
              <span className="text-[#9CA3AF] text-xs">Yeni badge qazandın! 🎉</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clan battle result */}
        {results.isClanBattle && results.clanResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="w-full rounded-2xl p-4"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
          >
            <p className="text-white font-bold text-sm text-center mb-3">🛡️ Klan Mübarizəsi</p>
            {results.clanResults.map(c => (
              <div key={c.clanName} className="flex items-center justify-between py-2">
                <span className="text-white text-sm">{c.clanName} {c.isWinner && '🏆'}</span>
                <span className="font-bold text-sm" style={{ color: c.isWinner ? '#FFD700' : '#9CA3AF' }}>
                  {c.score} xal
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col gap-3 w-full"
        >
          <motion.button
            onClick={() => navigate(`/competition/${id}/lobby`)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
              boxShadow:  `0 4px 16px ${avatarColor}40`,
            }}
          >
            Yenidən oyna 🔁
          </motion.button>

          <button
            onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
            className="w-full py-3 rounded-2xl text-sm text-[#9CA3AF] font-medium
                       hover:text-white transition-colors border border-[rgba(255,255,255,0.08)]"
          >
            Dashboarda qayıt
          </button>
        </motion.div>

      </div>
    </div>
  )
}
