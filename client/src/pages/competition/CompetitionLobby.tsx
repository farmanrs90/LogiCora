import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

import { useSocket } from '../../hooks/useSocket'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import type { CompetitionInfo, Participant } from '../../types'

// ── Backend → frontend map (REST cavabını CompetitionInfo formatına çevir) ──
interface RawParticipant {
  studentId?: { _id: string; userId?: { _id: string; name: string; surname?: string } }
  score?: number
  rank?: number
  correctAnswers?: number
  totalAnswers?: number
}
interface RawCompetition {
  _id: string
  title: string
  pin: string
  status: 'waiting' | 'active' | 'finished'
  createdBy: string
  questions?: { questionId?: { subject?: string } }[]
  participants?: RawParticipant[]
}

function mapParticipant(p: RawParticipant): Participant {
  const u = p.studentId?.userId
  return {
    userId: u?._id ?? p.studentId?._id ?? '',     // User._id (vahid kimlik)
    name: u ? `${u.name} ${u.surname ?? ''}`.trim() : 'İştirakçı',
    avatarColor: '#9333EA',                            // REST rəng vermir → default
    score: p.score ?? 0,
    rank: p.rank ?? 0,
    correctCount: p.correctAnswers ?? 0,
    wrongCount: Math.max(0, (p.totalAnswers ?? 0) - (p.correctAnswers ?? 0)),
    avgResponseTime: 0,
  }
}

function mapCompetition(raw: RawCompetition): CompetitionInfo {
  return {
    _id: raw._id,
    title: raw.title,
    subject: raw.questions?.[0]?.questionId?.subject ?? 'Yarış',
    pin: raw.pin,
    status: raw.status,
    organizerId: raw.createdBy,                        // backend createdBy → organizerId
    participants: (raw.participants ?? []).map(mapParticipant),
    questionCount: raw.questions?.length ?? 0,
    isWeeklyMystery: false,
  }
}


// ── Participant avatar card ────────────────────────────────────────────────

function ParticipantCard({ p, index }: { p: Participant; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.04 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg"
        style={{ backgroundColor: p.avatarColor, boxShadow: `0 0 16px ${p.avatarColor}60` }}
      >
        {(p.name?.charAt(0) ?? '?').toUpperCase()}
      </div>
      <span className="text-[#9CA3AF] text-[10px] text-center leading-tight max-w-[60px] truncate">{p.name}</span>
    </motion.div>
  )
}

function EmptySlot({ index }: { index: number }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, delay: index * 0.15 }}
    >
      <div
        className="w-12 h-12 rounded-full"
        style={{ border: '2px dashed rgba(255,255,255,0.15)' }}
      />
      <span className="text-[rgba(255,255,255,0.15)] text-[10px]">•••</span>
    </motion.div>
  )
}

// ── Countdown overlay ─────────────────────────────────────────────────────

function CountdownOverlay({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' as const }}
          className="font-black text-center"
          style={{ fontSize: 120, lineHeight: 1, color: count > 1 ? '#3B82F6' : '#EF4444' }}
        >
          {count === 0 ? '🚀' : count}
        </motion.div>
      </AnimatePresence>
      <p className="text-white font-bold text-xl">
        {count > 0 ? 'Hazır ol!' : 'Başlayır!'}
      </p>
    </motion.div>
  )
}

// ── Main Lobby ────────────────────────────────────────────────────────────

export default function CompetitionLobby() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSpectator = searchParams.get('spectator') === 'true'

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  // Fetch competition info
  const { data: comp, isLoading, isError, refetch } = useQuery<CompetitionInfo>({
    queryKey: ['competition', id],
    queryFn: () => api.get<{ data: RawCompetition }>(API_ROUTES.COMPETITIONS.BY_ID(id!))
      .then(r => mapCompetition(r.data.data)),
    enabled: !!id,
    staleTime: 1000 * 30,
  })

  const [participants, setParticipants] = useState<Participant[]>(comp?.participants ?? [])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // Update participants when query data arrives
  useEffect(() => {
    if (comp) setParticipants(comp.participants)
  }, [comp])

  // Socket
  const { socketRef, isConnected, emit } = useSocket(id ?? null)

  // Socket event handlers — stable refs via useCallback
  const handleParticipantJoined = useCallback((p: Participant) => {
    setParticipants(prev => [...prev.filter(x => x.userId !== p.userId), p])
  }, [])
  const handleCountdown = useCallback((data: { seconds: number }) => {
    setCountdown(data.seconds)
  }, [])

  // Attach socket listeners when connected
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isConnected) return

    // Announce ourselves
    socket.emit('competition:join', {
      competitionId: id,
      userId: user?._id,
      name: `${user?.name} ${user?.surname}`,
      avatarColor,
    })

    socket.on('participant:joined', handleParticipantJoined)
    socket.on('competition:countdown', handleCountdown)

    return () => {
      socket.off('participant:joined', handleParticipantJoined)
      socket.off('competition:countdown', handleCountdown)
    }
  }, [isConnected, id, avatarColor, user, handleParticipantJoined, handleCountdown, socketRef])

  // Local countdown tick
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      navigate(APP_ROUTES.COMPETITION.ROOM(id!))
      return
    }
    const t = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [countdown, id, navigate])

  function handleCopyPin() {
    if (!comp) return
    navigator.clipboard.writeText(comp.pin).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => toast.error('Kopyalanmadı'))
  }

  function handleStart() {
    if (participants.length < 2) {
      toast.error('Minimum 2 iştirakçı lazımdır!')
      return
    }
    emit('competition:start', { competitionId: id })
    setCountdown(3)
  }

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

  // Backend/şəbəkə xətası: fake lobby göstərmirik — istifadəçiyə real xəta vəziyyəti bildirilir.
  if (isError || !comp) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-white font-bold text-2xl mb-2">Yarış məlumatları yüklənmədi</h1>
          <p className="text-[#9CA3AF] text-sm mb-6">Bağlantını yoxlayıb yenidən cəhd edin.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/competition')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#9CA3AF] border border-[rgba(255,255,255,0.12)] hover:text-white transition-colors"
            >
              ← Yarışlara qayıt
            </button>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, #9333EA)` }}
            >
              Yenidən yoxla
            </button>
          </div>
        </div>
      </div>
    )
  }

  const competition = comp
  const isOrganizer = competition.organizerId === user?._id
  const maxSlots = 20
  const emptySlots = Math.max(0, maxSlots - competition.participants.length)

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && <CountdownOverlay count={countdown} />}
      </AnimatePresence>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full opacity-10 blur-[80px]"
          style={{ backgroundColor: avatarColor }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-10 blur-[80px]"
          style={{ backgroundColor: '#9333EA' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-8 gap-8 max-w-xl mx-auto w-full">

        {/* Yarış statusu */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.p
            className="text-white font-bold text-lg text-center"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {competition.isWeeklyMystery
              ? '🔮 Həftənin Sirri başlayır!'
              : 'Hazır olun! Yarış başlamaq üzrədir!'}
          </motion.p>
        </motion.div>

        {/* Competition title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center"
        >
          <h1 className="text-white font-black text-2xl lg:text-3xl">{competition.title}</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{competition.subject} · {competition.questionCount} sual</p>
        </motion.div>

        {/* PIN display */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-3 w-full"
        >
          <p className="text-[#9CA3AF] text-sm">Dostlarına bu PIN-i göndər</p>

          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="font-black text-center tracking-[0.25em]"
            style={{
              fontSize: 64,
              lineHeight: 1,
              background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {competition.pin}
          </motion.div>

          <button
            onClick={handleCopyPin}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: copied ? '#22C55E' : '#9CA3AF',
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Kopyalandı!' : 'PIN-i kopyala'}
          </button>
        </motion.div>

        {/* Participants grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-bold text-sm">İştirakçılar</span>
            <motion.span
              className="font-black text-sm"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.4 }}
              key={participants.length}
              style={{ color: avatarColor }}
            >
              {participants.length} qoşuldu
            </motion.span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
            {participants.map((p, i) => (
              <ParticipantCard key={p.userId} p={p} index={i} />
            ))}
            {[...Array(Math.min(emptySlots, 16 - participants.length))].map((_, i) => (
              <EmptySlot key={`empty-${i}`} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Socket status */}
        {!isConnected && (
          <div className="flex items-center gap-2 text-[#9CA3AF] text-xs">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#EAB308]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            Serverə qoşulunur...
          </div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          {isOrganizer ? (
            <motion.button
              onClick={handleStart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={participants.length < 2}
              className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
                boxShadow: `0 4px 24px ${avatarColor}40`,
              }}
            >
              Yarışı Başlat 🚀
              {participants.length < 2 && (
                <span className="block text-xs font-normal mt-0.5 opacity-70">Min. 2 iştirakçı lazımdır</span>
              )}
            </motion.button>
          ) : isSpectator ? (
            <div className="text-center">
              <p className="text-[#9CA3AF] text-sm">İzləyici rejimindəsiniz 👀</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >●</motion.span>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                >●</motion.span>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
                >●</motion.span>
                <span>Müəllim yarışı başladacaq</span>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
