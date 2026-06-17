import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import { useInterval } from '../../hooks/useInterval'
import { questionService } from '../../services/questionService'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import type { RootState } from '../../app/store'
import type { Question, AgeGroup, GamificationProfile } from '../../types'
import { APP_ROUTES, API_ROUTES } from '../../constants'

import FormatA from '../../features/quiz/formats/FormatA'
import FormatB from '../../features/quiz/formats/FormatB'
import FormatC from '../../features/quiz/formats/FormatC'
import FormatD from '../../features/quiz/formats/FormatD'
import FormatE from '../../features/quiz/formats/FormatE'

// ── Types ─────────────────────────────────────────────────────────────────

type Phase = 'question' | 'feedback' | 'result' | 'no_hearts' | 'completed'

// ── Helpers ───────────────────────────────────────────────────────────────

function isChildAge(ag?: AgeGroup) {
  return ag === '3-5' || ag === '6-8'
}

// ── Confetti piece ────────────────────────────────────────────────────────

function ConfettiPiece({ i }: { i: number }) {
  const angle = (i / 20) * 2 * Math.PI
  const dist = 120 + Math.random() * 80
  const colors = ['#9333EA', '#3B82F6', '#58CC02', '#F97316', '#EC4899', '#EAB308']
  const color = colors[i % colors.length]
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color, top: '50%', left: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        rotate: Math.random() * 360,
      }}
      transition={{ duration: 1.2, ease: 'easeOut' as const }}
    />
  )
}

// ── XP Count-up ───────────────────────────────────────────────────────────

function XPCountUp({ target }: { target: number }) {
  const count = useMotionValue(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.5,
      ease: 'easeOut' as const,
      onUpdate: v => { if (ref.current) ref.current.textContent = String(Math.round(v)) },
    })
    return controls.stop
  }, [target, count])

  return <span ref={ref}>0</span>
}

// ── Floating XP coins ─────────────────────────────────────────────────────

function XPCoins({ visible, amount }: { visible: boolean; amount: number }) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="fixed z-50 text-xl pointer-events-none select-none"
              style={{ left: `${40 + i * 4}%`, top: '60%' }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: -200, opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' as const }}
            >
              ⭐
            </motion.div>
          ))}
          <motion.div
            className="fixed z-50 top-[72px] left-4 text-[#EAB308] font-black text-lg pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.8] }}
            exit={{}}
            transition={{ duration: 1.2 }}
          >
            +{amount} XP
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Mascot popup ──────────────────────────────────────────────────────────

function MascotPopup({ correct, xp }: { correct: boolean; xp: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${correct ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="text-3xl">{correct ? '🤖' : '🧙‍♀️'}</span>
      <div>
        <p className="text-white font-bold text-sm">
          {correct ? 'Əla!' : 'Olur, növbəti dəfə!'}
        </p>
        {correct && (
          <p className="text-[#22C55E] text-xs font-semibold">+{xp} XP qazandın</p>
        )}
      </div>
    </motion.div>
  )
}

// ── No Hearts overlay ─────────────────────────────────────────────────────

function NoHeartsScreen({ gems, onExit, onBuyFreeze, isBuying }: { gems: number; onExit: () => void; onBuyFreeze: () => void; isBuying: boolean }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
        className="text-7xl"
      >
        🧙‍♀️
      </motion.div>
      <h2 className="text-white font-black text-2xl text-center">Ürəklər tükəndi 💔</h2>
      <p className="text-[#9CA3AF] text-sm text-center max-w-xs">
        Cora deyir: "Hər çətinlik sizi gücləndirir. Sabah yenidən cəhd et!"
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {gems >= 50 && (
          <button
            disabled={isBuying}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', boxShadow: '0 4px 16px rgba(6,182,212,0.4)' }}
            onClick={onBuyFreeze}
          >
            {isBuying ? 'Alınır...' : '💎 50 gem ilə Streak Freeze al'}
          </button>
        )}
        <button
          onClick={onExit}
          className="w-full py-3.5 rounded-2xl font-bold text-[#9CA3AF] text-sm border border-[rgba(255,255,255,0.1)]"
        >
          Sabah davam et
        </button>
        <button
          onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
          className="text-[#9CA3AF] text-xs text-center"
        >
          Dashboarda qayıt
        </button>
      </div>
    </motion.div>
  )
}

// ── Result screen ─────────────────────────────────────────────────────────

function ResultScreen({
  answered, total, xp, streak, badge, onDashboard,
}: {
  answered: number
  total: number
  xp: number
  streak: number
  badge?: { name: string; emoji: string }
  onDashboard: () => void
}) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: '#0D0D0D' }}
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {showConfetti && [...Array(20)].map((_, i) => <ConfettiPiece key={i} i={i} />)}
        </AnimatePresence>
      </div>

      {/* Mascots */}
      <div className="flex items-end gap-4">
        <motion.span
          className="text-6xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.3 }}
        >
          🤖
        </motion.span>
        <motion.span
          className="text-6xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
        >
          🧙‍♀️
        </motion.span>
      </div>

      <h2 className="text-white font-black text-3xl text-center">Təbrik edirik! 🎉</h2>

      {/* XP big number */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
        className="flex flex-col items-center"
      >
        <span className="text-6xl font-black" style={{ color: '#EAB308' }}>
          +<XPCountUp target={xp} />
        </span>
        <span className="text-[#9CA3AF] text-sm">XP qazandın</span>
      </motion.div>

      {/* Stats */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-white font-black text-xl">{answered}/{total}</span>
          <span className="text-[#9CA3AF] text-xs">sual</span>
        </div>
        <div className="w-px h-8 bg-[rgba(255,255,255,0.1)]" />
        <div className="flex flex-col items-center">
          <span className="text-xl font-black" style={{ color: '#F97316' }}>🔥 {streak}</span>
          <span className="text-[#9CA3AF] text-xs">gün sıra</span>
        </div>
      </div>

      {/* Badge */}
      <AnimatePresence>
        {badge && (
          <motion.div
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            <span className="text-4xl">{badge.emoji}</span>
            <span className="text-white font-bold text-sm">{badge.name}</span>
            <span className="text-[#9CA3AF] text-xs">Yeni badge!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onDashboard}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full max-w-xs py-4 rounded-2xl font-black text-white text-base"
        style={{ background: 'linear-gradient(135deg, #9333EA, #3B82F6)', boxShadow: '0 4px 20px rgba(147,51,234,0.4)' }}
      >
        Dashboarda qayıt
      </motion.button>
    </motion.div>
  )
}

// ── Main DailyQuiz ────────────────────────────────────────────────────────

export default function DailyQuiz() {
  const navigate = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const ageGroup = user?.ageGroup as AgeGroup | undefined
  const isSpecialNeeds = user?.isSpecialNeeds ?? false
  const isChild = isChildAge(ageGroup)

  // Fetch questions
  const { data: questions, isLoading, isError, refetch } = useQuery<Question[]>({
    queryKey: ['daily', 'questions'],
    queryFn: () => questionService.fetchDaily(ageGroup),
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  // Answer mutation
  const mutation = useMutation({
    mutationFn: ({ questionId, answer, responseTime }: { questionId: string; answer: string; responseTime: number }) =>
      questionService.submitAnswer(questionId, answer, responseTime),
  })

  // Gamification (gems balansı — Streak Freeze alışı üçün)
  const queryClient = useQueryClient()
  const { data: gamification } = useQuery<GamificationProfile>({
    queryKey: ['gamification', 'me'],
    queryFn: () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then(r => r.data.data),
    enabled: user?.role === 'student',
    staleTime: 1000 * 60,
  })

  // Streak Freeze — real backend alışı (50 gem). Uğur yalnız 200-dən sonra; balans yenilənir.
  const freezeMutation = useMutation({
    mutationFn: () => api.post<{ message?: string }>('/streak-freeze/buy').then(r => r.data),
    onSuccess: (res) => {
      toast.success(res?.message || 'Streak Freeze alındı.')
      queryClient.invalidateQueries({ queryKey: ['gamification', 'me'] })
    },
    onError: () => toast.error('Streak Freeze alınmadı. Balansı və bağlantını yoxlayın.'),
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [phase, setPhase] = useState<Phase>('question')
  const [timeLeft, setTimeLeft] = useState(30)
  const [heartsLeft, setHeartsLeft] = useState(5)
  const [totalXP, setTotalXP] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showCoins, setShowCoins] = useState(false)
  const [lastXP, setLastXP] = useState(0)
  const [showMascot, setShowMascot] = useState(false)
  const [mascotCorrect, setMascotCorrect] = useState(false)
  const [earnedBadge, setEarnedBadge] = useState<{ name: string; emoji: string } | undefined>()
  const [answeredCount, setAnsweredCount] = useState(0)
  const [revealedAnswer, setRevealedAnswer] = useState('')   // ← YENİ: serverdən gələn düzgün cavab


  const startTimeRef = useRef<number>(Date.now())

  const totalQuestions = questions?.length ?? 5
  const current = questions?.[currentIndex]
  const format = current?.format ?? 'A'
  const totalTime = current?.timeLimit ?? 30

  const goDashboard = useCallback(() => {
    navigate(APP_ROUTES.DASHBOARD.STUDENT)
  }, [navigate])

  const handleExitQuiz = useCallback(() => {
    if ((phase === 'question' || phase === 'feedback') && current) {
      const shouldLeave = window.confirm('Quizdən çıxmaq istəyirsiniz? Cavablanmamış suallar itə bilər.')
      if (!shouldLeave) return
    }

    goDashboard()
  }, [current, goDashboard, phase])

  // Reset timer when question changes
  useEffect(() => {
    if (!current) return
    setTimeLeft(current.timeLimit ?? 30)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setRevealedAnswer('')
    startTimeRef.current = Date.now()
  }, [currentIndex, current])

  // Countdown timer
  const handleTimeUp = useCallback(() => {
    if (isAnswered || phase !== 'question') return
    handleAnswer('__timeout__') // boş cavab backend-də 400 verir, sentinel göndəririk
  }, [isAnswered, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(
    () => {
      setTimeLeft(t => {
        if (t <= 1) { handleTimeUp(); return 0 }
        return t - 1
      })
    },
    phase === 'question' && !isAnswered ? 1000 : null,
  )

  // Handle answer submission
  async function handleAnswer(answerId: string) {
    if (isAnswered || !current) return

    const responseTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setSelectedAnswer(answerId)
    setIsAnswered(true)

    try {
      const res = await mutation.mutateAsync({
        questionId: current._id,
        answer: answerId,
        responseTime,
      })

      const correct = res.correct
      setRevealedAnswer(res.correctAnswer)
      setMascotCorrect(correct)
      setShowMascot(true)
      setHeartsLeft(res.heartsLeft)
      setStreak(res.newStreak)
      if (res.badge) setEarnedBadge(res.badge)

      if (correct) {
        setLastXP(res.xpEarned)
        setTotalXP(prev => prev + res.xpEarned)
        setShowCoins(true)
        setTimeout(() => setShowCoins(false), 1200)
      } else {
        if (res.heartsLeft <= 0) {
          setTimeout(() => setPhase('no_hearts'), 1200)
          return
        }
      }

      setAnsweredCount(prev => prev + 1)

      // Advance or show result after feedback delay
      setTimeout(() => {
        setShowMascot(false)
        setPhase('feedback')
        setTimeout(() => {
          if (currentIndex + 1 >= totalQuestions) {
            setPhase('result')
          } else {
            setCurrentIndex(i => i + 1)
            setPhase('question')
          }
        }, 400)
      }, 1400)

    } catch {
      // Backend timeout sentinel-ini (__timeout__) qəbul etmir (400) və ya şəbəkə xətası baş verir.
      // UI donmamalı — cavabı buraxılmış sayıb feedback-siz növbəti suala / nəticəyə keçirik.
      toast(answerId === '__timeout__' ? 'Vaxt bitdi ⏱️' : 'Cavab göndərilmədi, növbəti suala keçirik')
      setShowMascot(false)
      setAnsweredCount(prev => prev + 1)
      setTimeout(() => {
        if (currentIndex + 1 >= totalQuestions) {
          setPhase('result')
        } else {
          setCurrentIndex(i => i + 1)
          setPhase('question')
        }
      }, 800)
    }
  }

  // ── Render: loading ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' as const }}
          className="w-14 h-14 rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${avatarColor} ${avatarColor}40 ${avatarColor}40 ${avatarColor}40` }}
        />
        <p className="text-[#9CA3AF] text-sm">Suallar yüklənir...</p>
      </div>
    )
  }

  // ── Render: boş / xəta (sonsuz loading-in qarşısını alır) ───────────────
  if (isError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="text-6xl">🧩</div>
        <div>
          <h2 className="text-white font-bold text-xl mb-1">Bugünkü suallar hazır deyil</h2>
          <p className="text-[#9CA3AF] text-sm max-w-sm">
            Hazırda gündəlik sualları yükləyə bilmədik. Bir azdan yenidən cəhd et və ya paneldən digər fəaliyyətlərə davam et.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, #9333EA)` }}
          >
            Yenidən cəhd et
          </button>
          <button
            onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
            className="px-5 py-2.5 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10 hover:text-white transition-colors"
          >
            Panelə qayıt
          </button>
        </div>
      </div>
    )
  }

  // ── Render: result ─────────────────────────────────────────────────────

  if (phase === 'result') {
    return (
      <ResultScreen
        answered={answeredCount}
        total={totalQuestions}
        xp={totalXP}
        streak={streak}
        badge={earnedBadge}
        onDashboard={goDashboard}
      />
    )
  }

  // ── Render: no hearts ──────────────────────────────────────────────────

  if (phase === 'no_hearts') {
    return (
      <NoHeartsScreen
        gems={gamification?.gems ?? 0}
        onBuyFreeze={() => freezeMutation.mutate()}
        isBuying={freezeMutation.isPending}
        onExit={goDashboard}
      />
    )
  }

  // ── Render: question ───────────────────────────────────────────────────

  const timerPct = totalTime > 0 ? timeLeft / totalTime : 0
  const timerColor = timerPct > 0.5 ? '#22C55E' : timerPct > 0.25 ? '#EAB308' : '#EF4444'

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* ── Header ── */}
      <div
        className="shrink-0 px-4 lg:px-6 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={handleExitQuiz}
          className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-[#9CA3AF] border border-white/10 hover:text-white hover:border-white/20 transition-colors"
        >
          <span className="hidden sm:inline">Panelə qayıt</span>
          <span className="sm:hidden">Çıxış</span>
        </button>

        {/* XP earned today */}
        <div className="flex items-center gap-1.5 min-w-[72px]">
          <span className="text-base">⭐</span>
          <span className="font-bold text-sm" style={{ color: avatarColor }}>{totalXP} XP</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[#9CA3AF] text-[10px]">
              {currentIndex + 1}/{totalQuestions}
            </span>
          </div>
          <div className="h-2.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: avatarColor }}
              animate={{ width: `${((currentIndex) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' as const }}
            />
          </div>
        </div>

        {/* Hearts */}
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              className="text-base"
              animate={i === heartsLeft ? { scale: [1, 1.4, 0.8, 1] } : {}}
            >
              {i < heartsLeft ? '❤️' : '🖤'}
            </motion.span>
          ))}
        </div>

        {/* Timer (not shown in FormatB — it has its own) */}
        {format !== 'B' && (
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm tabular-nums"
            style={{
              border: `2px solid ${timerColor}`,
              color: timerColor,
              backgroundColor: `${timerColor}15`,
            }}
          >
            {timeLeft}
          </div>
        )}
      </div>

      {/* ── Question area ── */}
      <div className="flex-1 flex items-center justify-center py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${format}`}
            initial={{ x: 260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' as const }}
            className="w-full"
          >
            {format === 'A' && current && (
              <FormatA
                question={current}
                onAnswer={handleAnswer}
                isAnswered={isAnswered}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
                ageGroup={ageGroup}
                isSpecialNeeds={isSpecialNeeds}
              />
            )}
            {format === 'B' && current && (
              <FormatB
                question={current}
                onAnswer={handleAnswer}
                isAnswered={isAnswered}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
                timeLeft={timeLeft}
                totalTime={totalTime}
                ageGroup={ageGroup}
              />
            )}
            {format === 'C' && current && (
              <FormatC
                question={current}
                onAnswer={handleAnswer}
                isAnswered={isAnswered}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
            {format === 'D' && current && (
              <FormatD
                question={current}
                onAnswer={handleAnswer}
                isAnswered={isAnswered}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
            {format === 'E' && current && (
              <FormatE
                question={current}
                onAnswer={handleAnswer}
                isAnswered={isAnswered}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Mascot popup ── */}
      <AnimatePresence>
        {showMascot && <MascotPopup correct={mascotCorrect} xp={lastXP} />}
      </AnimatePresence>

      {/* ── XP coins ── */}
      <XPCoins visible={showCoins} amount={lastXP} />

      {/* ── Age hint for children ── */}
      {isChild && !isAnswered && (
        <div className="shrink-0 px-4 pb-4 text-center">
          <p className="text-[#9CA3AF] text-xs">Cavabını seç 👆</p>
        </div>
      )}
    </div>
  )
}
