import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import { useSocket } from '../../hooks/useSocket'
import { useInterval } from '../../hooks/useInterval'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import type { Participant, Question, AgeGroup } from '../../types'
import FormatA from '../../features/quiz/formats/FormatA'
import FormatB from '../../features/quiz/formats/FormatB'

// ── Arena backgrounds ─────────────────────────────────────────────────────

function CosmicBackground() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 3 + 1,
    d: Math.random() * 3 + 1,
  }))
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a0533 0%, #0a0118 60%, #000 100%)' }}>
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: s.d, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-96 h-96 rounded-full opacity-10 blur-[80px]"
        style={{ background: 'radial-gradient(circle, #9333EA, transparent)' }} />
    </div>
  )
}

function StadiumBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0f1628 60%, #1a0a28 100%)' }}>
      {/* City silhouette */}
      <svg className="absolute bottom-0 w-full opacity-20" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path d="M0 200 L0 120 L40 120 L40 80 L80 80 L80 100 L120 100 L120 60 L160 60 L160 100
                 L200 100 L200 40 L240 40 L240 100 L280 100 L280 70 L320 70 L320 90 L360 90
                 L360 50 L400 50 L400 90 L440 90 L440 60 L480 60 L480 90 L520 90 L520 30
                 L560 30 L560 90 L600 90 L600 70 L640 70 L640 100 L680 100 L680 50 L720 50
                 L720 100 L760 100 L760 80 L800 80 L800 200 Z"
          fill="#3B82F6" />
      </svg>
      {/* Animated lights */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-8 rounded-full"
          style={{
            left: `${10 + i * 14}%`,
            width: 4,
            height: 4,
            backgroundColor: ['#3B82F6', '#9333EA', '#EAB308', '#EF4444', '#22C55E', '#06B6D4'][i],
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.8, 1] }}
          transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function ClassicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none"
      style={{
        background: '#0D0D0D',
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
  )
}

// ── Mini leaderboard ──────────────────────────────────────────────────────

function MiniLeaderboard({ board, myId }: { board: Participant[]; myId?: string }) {
  const top5 = board.slice(0, 5)
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed right-0 top-16 bottom-0 w-72 z-30 p-4 flex flex-col gap-3"
      style={{ background: 'rgba(17,24,39,0.96)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-white font-bold text-sm text-center">Sıralama 🏅</p>
      {top5.map((p, i) => (
        <motion.div
          key={p.userId}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${p.userId === myId ? 'ring-1' : ''}`}
          style={{
            background: p.userId === myId ? 'rgba(147,51,234,0.12)' : 'rgba(255,255,255,0.04)',
            outline: p.userId === myId ? '1px solid #9333EA' : undefined,
          }}
        >
          <span className="text-base w-6 text-center font-black text-[#9CA3AF]">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
            style={{ backgroundColor: p.avatarColor }}
          >
            {p.name?.charAt(0) ?? '?'}
          </div>
          <span className="flex-1 text-sm font-semibold text-white truncate">{p.name}</span>
          <span className="text-xs font-bold text-[#9CA3AF]">{p.score}</span>
        </motion.div>
      ))}
    </motion.div>
  )
}

// ── Spectator reactions ───────────────────────────────────────────────────

function SpectatorPanel({ onReact }: { onReact: (type: string) => void }) {
  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3"
    >
      {[{ type: 'fire', emoji: '🔥' }, { type: 'bolt', emoji: '⚡' }, { type: 'strength', emoji: '💪' }].map(r => (
        <motion.button
          key={r.type}
          onClick={() => onReact(r.type)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {r.emoji}
        </motion.button>
      ))}
    </motion.div>
  )
}

// ── Waiting state ─────────────────────────────────────────────────────────

function WaitingForOthers({ waitingCount, total }: { waitingCount: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.p className="text-white font-bold text-xl">
        Digər iştirakçılar cavablayır
      </motion.p>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[#9CA3AF]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
      <p className="text-[#9CA3AF] text-sm">{waitingCount}/{total} cavab verdi</p>
    </div>
  )
}

// ── Room phases & state ───────────────────────────────────────────────────

type RoomPhase = 'waiting' | 'question' | 'submitted' | 'mini_result'
// ── Host (müəllim) idarəetmə görünüşü ──────────────────────────────────────

function HostView({
  question, questionNumber, totalQuestions, timeLeft, phase,
  correctAnswer, leaderboard, answeredCount, participantTotal, title,
}: {
  question: Question | null
  questionNumber: number
  totalQuestions: number
  timeLeft: number
  phase: RoomPhase
  correctAnswer: string
  leaderboard: Participant[]
  answeredCount: number
  participantTotal: number
  title: string
}) {
  const timerPct = question ? timeLeft / (question.timeLimit ?? 20) : 1
  const timerColor = timerPct > 0.5 ? '#22C55E' : timerPct > 0.25 ? '#EAB308' : '#EF4444'
  const revealed = phase === 'mini_result'
  const total = participantTotal || leaderboard.length

  return (
    <div className="min-h-screen flex flex-col relative">
      <ClassicBackground />

      {/* Header */}
      <div
        className="relative z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-2 py-1 rounded-md" style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}>HOST</span>
          <span className="text-[#9CA3AF] text-xs truncate max-w-[160px]">{title}</span>
        </div>
        <span className="text-[#9CA3AF] text-xs">{questionNumber}/{totalQuestions} sual</span>
      </div>

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Sual + cavablar (yalnız izləmə, klik yox) */}
        <div className="lg:col-span-2 flex flex-col">
          {question ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Sual {questionNumber}</span>
                {phase === 'question' && (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-black tabular-nums"
                    style={{ border: `2px solid ${timerColor}`, color: timerColor, backgroundColor: `${timerColor}15` }}
                  >
                    {timeLeft}
                  </div>
                )}
              </div>
              <h2 className="text-white font-bold text-2xl leading-snug">{question.text}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((o) => {
                  const isCorrect = revealed && o.id === correctAnswer
                  return (
                    <div
                      key={o.id}
                      className="px-4 py-4 rounded-xl text-white font-semibold border transition-colors"
                      style={{
                        background: isCorrect ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.04)',
                        borderColor: isCorrect ? '#22C55E' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <span className="opacity-50 mr-2">{o.id}</span>{o.text}
                      {isCorrect && <span className="ml-2">✅</span>}
                    </div>
                  )
                })}
              </div>

              {/* Cavab progressi */}
              <div className="mt-auto pt-4">
                <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                  <span>Cavab verənlər</span>
                  <span>{answeredCount}/{total}</span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#9333EA' }}
                    animate={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <motion.span className="text-6xl" animate={{ y: [0, -12, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>🎤</motion.span>
              <p className="text-white font-bold text-xl">Yarışı idarə edirsən</p>
              <p className="text-[#9CA3AF] text-sm">İlk sual göndərilir...</p>
            </div>
          )}
        </div>

        {/* Canlı sıralama */}
        <div className="rounded-2xl p-4 flex flex-col min-h-0" style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-white font-bold text-sm mb-3 text-center">Canlı Sıralama 🏅</p>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {leaderboard.length === 0 && <p className="text-[#9CA3AF] text-xs text-center mt-4">Hələ xal yoxdur</p>}
            {leaderboard.map((p, i) => (
              <div key={p.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="w-6 text-center font-black text-[#9CA3AF]">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0" style={{ backgroundColor: p.avatarColor }}>{p.name?.charAt(0) ?? '?'}</div>
                <span className="flex-1 text-sm font-semibold text-white truncate">{p.name}</span>
                <span className="text-xs font-bold text-[#9CA3AF]">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompetitionRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSpectator = searchParams.get('spectator') === 'true'

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const ag = (user?.ageGroup ?? '12-14') as AgeGroup
  const isChild = ag === '3-5' || ag === '6-8'
  const isYoung = ag === '9-11' || ag === '12-14'

  // Fetch competition metadata (host təyini üçün createdBy lazımdır)
  const { data: competitionMeta } = useQuery({
    queryKey: ['competition', id],
    queryFn: () => api.get(API_ROUTES.COMPETITIONS.BY_ID(id!))
      .then(r => r.data.data as { createdBy?: string; title?: string })
      .catch(() => null),
    enabled: !!id,
    staleTime: 1000 * 60,
  })

  const isHost = !!competitionMeta?.createdBy && competitionMeta.createdBy === user?._id

  const { socketRef, isConnected, emit } = useSocket(id ?? null)

  const [phase, setPhase] = useState<RoomPhase>('waiting')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [isAnswered, setIsAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [myRank, setMyRank] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [leaderboard, setLeaderboard] = useState<Participant[]>([])
  const [participantTotal, setParticipantTotal] = useState(0)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [reactionEmoji, setReactionEmoji] = useState<{ emoji: string; key: number } | null>(null)

  const startTimeRef = useRef<number>(Date.now())

  // Socket qoşula bilmirsə real bağlantı xətası göstəririk — FAKE demo sual YOX.
  const [connectionError, setConnectionError] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  useEffect(() => {
    if (isConnected) { setConnectionError(false); return }
    const t = setTimeout(() => setConnectionError(true), 8000)
    return () => clearTimeout(t)
  }, [isConnected, retryNonce])

  const handleReconnect = useCallback(() => {
    setConnectionError(false)
    setRetryNonce(n => n + 1)        // 8s aşkarlama taymerini yenidən başlat
    socketRef.current?.connect()     // socket.io manual reconnect
  }, [socketRef])

  // Socket event handlers
  const handleQuestion = useCallback((data: { question: Question; questionNumber: number; totalQuestions: number }) => {
    setCurrentQuestion(data.question)
    setQuestionNumber(data.questionNumber)
    setTotalQuestions(data.totalQuestions)
    setTimeLeft(data.question.timeLimit ?? 20)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setCorrectAnswer('')
    setAnsweredCount(0)
    setPhase('question')
    startTimeRef.current = Date.now()
  }, [])

  const handleAnswerResult = useCallback((data: { correct: boolean; correctAnswer: string; xpEarned: number; newRank: number; answeredCount: number; total: number }) => {
    setCorrectAnswer(data.correctAnswer)
    setMyRank(data.newRank)
    setMyScore(s => s + data.xpEarned)
    setAnsweredCount(data.answeredCount)
    setPhase('submitted')
  }, [])

  const handleQuestionEnd = useCallback((data: { leaderboard: Participant[]; correctAnswer?: string }) => {
    setLeaderboard(data.leaderboard)
    setCorrectAnswer(data.correctAnswer ?? '')
    setShowLeaderboard(true)
    setPhase('mini_result')
    setTimeout(() => {
      setShowLeaderboard(false)
      setPhase('waiting')
    }, 3000)
  }, [])

  const handleProgress = useCallback((data: { answeredCount: number; total: number; leaderboard?: Participant[] }) => {
    setAnsweredCount(data.answeredCount)
    setParticipantTotal(data.total)
    if (data.leaderboard) setLeaderboard(data.leaderboard)
  }, [])

  const handleEnd = useCallback(() => {
    navigate(APP_ROUTES.COMPETITION.RESULT(id!))
  }, [id, navigate])

  const handleSpectatorCount = useCallback((data: { count: number }) => {
    setSpectatorCount(data.count)
  }, [])

  const handleReaction = useCallback((data: { type: string }) => {
    const map: Record<string, string> = { fire: '🔥', bolt: '⚡', strength: '💪' }
    setReactionEmoji({ emoji: map[data.type] ?? '❤️', key: Date.now() })
    setTimeout(() => setReactionEmoji(null), 1500)
  }, [])

  // Attach socket listeners
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !isConnected) return

    socket.on('competition:question', handleQuestion)
    socket.on('competition:answer_result', handleAnswerResult)
    socket.on('competition:question_end', handleQuestionEnd)
    socket.on('competition:end', handleEnd)
    socket.on('competition:spectators', handleSpectatorCount)
    socket.on('competition:reaction', handleReaction)
    socket.on('competition:progress', handleProgress)
    // Təzə socket köhnə otaqda deyil → otağa qoşul + cari sualı istə
    socket.emit('competition:ready', { competitionId: id })
    return () => {




      socket.off('competition:question', handleQuestion)
      socket.off('competition:answer_result', handleAnswerResult)
      socket.off('competition:question_end', handleQuestionEnd)
      socket.off('competition:end', handleEnd)
      socket.off('competition:spectators', handleSpectatorCount)
      socket.off('competition:reaction', handleReaction)
      socket.off('competition:progress', handleProgress)
    }
  }, [id, isConnected, socketRef, handleQuestion, handleAnswerResult, handleQuestionEnd, handleEnd, handleSpectatorCount, handleReaction, handleProgress])

  // Tab visibility
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && id) {
        emit('competition:tab_hidden', { competitionId: id })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [emit, id])

  // Timer
  const handleTimeUp = useCallback(() => {
    if (isHost) return
    if (isAnswered || phase !== 'question') return
    handleSubmitAnswer('')
  }, [isAnswered, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(
    () => setTimeLeft(t => { if (t <= 1) { handleTimeUp(); return 0 } return t - 1 }),
    phase === 'question' && !isAnswered ? 1000 : null,
  )

  function handleSubmitAnswer(answerId: string) {
    if (isHost) return
    if (isAnswered || !currentQuestion) return
    const responseTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setSelectedAnswer(answerId)
    setIsAnswered(true)
    emit('competition:answer', {
      competitionId: id,
      questionId: currentQuestion._id,
      answer: answerId,
      responseTime,
    })
    // Real nəticə serverdən 'competition:answer_result' event-i ilə gəlir — lokal fake nəticə YOX.
  }

  function handleSendReaction(type: string) {
    emit('competition:reaction', { competitionId: id, type })
  }

  // ── Arena selection ───────────────────────────────────────────────────

  const Arena = isChild ? CosmicBackground : isYoung ? StadiumBackground : ClassicBackground

  const timerPct = currentQuestion ? timeLeft / (currentQuestion.timeLimit ?? 20) : 1
  const timerColor = timerPct > 0.5 ? '#22C55E' : timerPct > 0.25 ? '#EAB308' : '#EF4444'

  // ── Real bağlantı xətası — fake yarış əvəzinə (host/player hər ikisi üçün) ──
  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Arena />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <motion.span className="text-6xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>📡</motion.span>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl">Yarış serverinə qoşulmaq mümkün olmadı</h2>
            <p className="text-[#9CA3AF] text-sm max-w-xs mx-auto">Bağlantını yoxlayın və yenidən cəhd edin.</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleReconnect}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #9333EA, #3B82F6)', boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }}
            >
              Yenidən qoşul
            </button>
            <button
              onClick={() => navigate(id ? APP_ROUTES.COMPETITION.LOBBY(id) : APP_ROUTES.DASHBOARD.STUDENT)}
              className="w-full py-3.5 rounded-2xl font-bold text-[#9CA3AF] text-sm border border-[rgba(255,255,255,0.12)]"
            >
              Lobby-ə qayıt
            </button>
            <button
              onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
              className="text-[#9CA3AF] text-xs"
            >
              Dashboard-a qayıt
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isHost) {
    return (
      <HostView
        question={currentQuestion}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        timeLeft={timeLeft}
        phase={phase}
        correctAnswer={correctAnswer}
        leaderboard={leaderboard}
        answeredCount={answeredCount}
        participantTotal={participantTotal}
        title={competitionMeta?.title ?? 'Yarış'}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Arena />

      {/* ── Header ── */}
      <div
        className="relative z-20 shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF] text-xs">
              {questionNumber}/{totalQuestions} sual
            </span>
            {myRank > 0 && (
              <span className="text-xs font-bold" style={{ color: avatarColor }}>
                {myRank}-ci yerdəsən
              </span>
            )}
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: avatarColor }}
              animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Timer (non-B format) */}
        {phase === 'question' && (isChild || !isYoung) && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm tabular-nums shrink-0"
            style={{ border: `2px solid ${timerColor}`, color: timerColor, backgroundColor: `${timerColor}15` }}
          >
            {timeLeft}
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-base">⭐</span>
          <span className="font-bold text-sm text-white">{myScore}</span>
        </div>

        {/* Spectator count */}
        {spectatorCount > 0 && (
          <span className="text-[#9CA3AF] text-xs shrink-0">👁 {spectatorCount}</span>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.span
                className="text-6xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                ⏳
              </motion.span>
              <p className="text-white font-bold text-xl text-center">
                {isConnected ? 'Sual gəlir...' : 'Yarış serverinə qoşulur...'}
              </p>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: avatarColor }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {(phase === 'question' || phase === 'submitted') && currentQuestion && (
            <motion.div
              key={`q-${currentQuestion._id}`}
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' as const }}
              className="w-full"
            >
              {phase === 'submitted' ? (
                <div className="flex flex-col items-center gap-4 px-4">
                  {/* Show format answer in answered state */}
                  {isChild ? (
                    <FormatA
                      question={currentQuestion}
                      onAnswer={() => { }}
                      isAnswered
                      correctAnswer={correctAnswer}
                      selectedAnswer={selectedAnswer}
                      avatarColor={avatarColor}
                      ageGroup={ag}
                    />
                  ) : (
                    <FormatB
                      question={currentQuestion}
                      onAnswer={() => { }}
                      isAnswered
                      correctAnswer={correctAnswer}
                      selectedAnswer={selectedAnswer}
                      avatarColor={avatarColor}
                      timeLeft={0}
                      totalTime={currentQuestion.timeLimit ?? 20}
                      ageGroup={ag}
                    />
                  )}
                  <div className="mt-4">
                    <WaitingForOthers waitingCount={answeredCount} total={leaderboard.length || 5} />
                  </div>
                </div>
              ) : isChild ? (
                <FormatA
                  question={currentQuestion}
                  onAnswer={handleSubmitAnswer}
                  isAnswered={isAnswered}
                  correctAnswer={correctAnswer}
                  selectedAnswer={selectedAnswer}
                  avatarColor={avatarColor}
                  ageGroup={ag}
                />
              ) : (
                <FormatB
                  question={currentQuestion}
                  onAnswer={handleSubmitAnswer}
                  isAnswered={isAnswered}
                  correctAnswer={correctAnswer}
                  selectedAnswer={selectedAnswer}
                  avatarColor={avatarColor}
                  timeLeft={timeLeft}
                  totalTime={currentQuestion.timeLimit ?? 20}
                  ageGroup={ag}
                />
              )}
            </motion.div>
          )}

          {phase === 'mini_result' && (
            <motion.div
              key="mini_result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 px-4"
            >
              <span className="text-5xl">
                {selectedAnswer === correctAnswer ? '✅' : '❌'}
              </span>
              <p className="text-white font-bold text-xl">
                {selectedAnswer === correctAnswer ? 'Düzgün!' : 'Səhv!'}
              </p>
              <p className="text-[#9CA3AF] text-sm">Növbəti sual gəlir...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Side panels ── */}
      <AnimatePresence>
        {showLeaderboard && (
          <MiniLeaderboard board={leaderboard} myId={user?._id} />
        )}
      </AnimatePresence>

      {isSpectator && <SpectatorPanel onReact={handleSendReaction} />}

      {/* ── Floating reaction ── */}
      <AnimatePresence>
        {reactionEmoji && (
          <motion.div
            key={reactionEmoji.key}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 2, 2, 0.5], y: -120 }}
            exit={{}}
            transition={{ duration: 1.5 }}
            className="fixed bottom-24 right-8 z-50 text-5xl pointer-events-none"
          >
            {reactionEmoji.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
