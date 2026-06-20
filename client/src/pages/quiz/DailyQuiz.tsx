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
import type { Question, AgeGroup, DailyStatusResponse, GamificationProfile } from '../../types'
import { APP_ROUTES, API_ROUTES } from '../../constants'

import FormatA from '../../features/quiz/formats/FormatA'
import FormatB from '../../features/quiz/formats/FormatB'
import FormatC from '../../features/quiz/formats/FormatC'
import FormatD from '../../features/quiz/formats/FormatD'
import FormatE from '../../features/quiz/formats/FormatE'

// ── Types ─────────────────────────────────────────────────────────────────

type Phase = 'question' | 'feedback' | 'result' | 'no_hearts' | 'completed'

// Sual səsi (audioQuestions) — real brauzer SpeechSynthesis. Backend-ə heç nə getmir, auto-play yoxdur.
const SPEECH_SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window
function speakQuestion(text: string) {
  if (!SPEECH_SUPPORTED || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'az-AZ'
  utterance.rate = 0.95
  synth.speak(utterance)
}

// Aktiv sual səhnəsi premium soft-navy qalır (Format komponentləri ağ mətnlidir,
// yəni light fonda görünməz olardı). Tamamlanma/limit/ürək/yükləmə ekranları light.
const QUIZ_STAGE_BG = 'linear-gradient(180deg, #0E1525 0%, #0B111E 100%)'

// ── Helpers ───────────────────────────────────────────────────────────────

function isChildAge(ag?: AgeGroup) {
  return ag === '3-5' || ag === '6-8'
}

function normalizeAnswerInput(answer: unknown): string {
  if (typeof answer === 'string') return answer.trim()

  if (answer && typeof answer === 'object') {
    const candidate = answer as { id?: unknown; answer?: unknown; selectedAnswer?: unknown; selectedOption?: unknown }
    const value = candidate.id ?? candidate.answer ?? candidate.selectedAnswer ?? candidate.selectedOption
    return typeof value === 'string' ? value.trim() : ''
  }

  return ''
}

function getQuestionId(question: Question | undefined): string {
  if (!question) return ''

  const fallbackId = (question as Question & { id?: unknown }).id
  const rawId = question._id || (typeof fallbackId === 'string' ? fallbackId : '')
  return typeof rawId === 'string' ? rawId.trim() : ''
}

// ── Confetti piece ────────────────────────────────────────────────────────

function ConfettiPiece({ i }: { i: number }) {
  const angle = (i / 20) * 2 * Math.PI
  const dist = 120 + Math.random() * 80
  const colors = ['#7C3AED', '#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#0EA5E9']
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
            className="fixed z-50 top-[72px] left-4 text-[#F59E0B] font-black text-lg pointer-events-none"
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

// ── Feedback popup (düzgün/yanlış — personaj/avatar deyil) ──────────────────

function FeedbackPopup({ correct, xp }: { correct: boolean; xp: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: correct ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)',
        border: `1px solid ${correct ? 'rgba(16,185,129,0.55)' : 'rgba(244,63,94,0.55)'}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="text-3xl">{correct ? '✅' : '🔁'}</span>
      <div>
        <p className="text-white font-bold text-sm">
          {correct ? 'Əla!' : 'Olur, növbəti dəfə!'}
        </p>
        {correct && (
          <p className="text-[#34D399] text-xs font-semibold">+{xp} XP qazandın</p>
        )}
      </div>
    </motion.div>
  )
}

// ── No Hearts screen (light premium) ────────────────────────────────────────

function NoHeartsScreen({ gems, onExit, onBuyFreeze, isBuying }: { gems: number; onExit: () => void; onBuyFreeze: () => void; isBuying: boolean }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-slate-50"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
          className="text-6xl"
        >
          🌙
        </motion.div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Ürəklər tükəndi 💔</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Hər çətinlik səni gücləndirir. Sabah yenidən cəhd et!
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {gems >= 50 && (
            <button
              disabled={isBuying}
              className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #4F46E5)' }}
              onClick={onBuyFreeze}
            >
              {isBuying ? 'Alınır...' : '💎 50 gem ilə Streak Freeze al'}
            </button>
          )}
          <button
            onClick={onExit}
            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Sabah davam et
          </button>
          <button
            onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            Dashboarda qayıt
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Result screen (light premium) ───────────────────────────────────────────

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
      className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-slate-50"
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {showConfetti && [...Array(20)].map((_, i) => <ConfettiPiece key={i} i={i} />)}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl"
      >
        {/* Tamamlanma nişanı (neytral — personaj yoxdur) */}
        <motion.span
          className="inline-block text-6xl"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.3 }}
        >
          🏆
        </motion.span>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">Təbrik edirik! 🎉</h2>

        {/* XP big number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.25 }}
          className="mt-5 flex flex-col items-center"
        >
          <span className="text-5xl font-black text-amber-500">
            +<XPCountUp target={xp} />
          </span>
          <span className="mt-1 text-sm text-gray-500">XP qazandın</span>
        </motion.div>

        {/* Stats */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tabular-nums text-gray-900">{answered}/{total}</span>
            <span className="text-xs text-gray-500">sual</span>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-orange-500">🔥 {streak}</span>
            <span className="text-xs text-gray-500">gün sıra</span>
          </div>
        </div>

        {/* Badge */}
        <AnimatePresence>
          {badge && (
            <motion.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="mx-auto mt-6 flex w-fit flex-col items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4"
            >
              <span className="text-4xl">{badge.emoji}</span>
              <span className="text-sm font-bold text-gray-900">{badge.name}</span>
              <span className="text-xs text-amber-600">Yeni badge!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={onDashboard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-7 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Dashboarda qayıt
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ── Completed today screen (light premium) ──────────────────────────────────

function CompletedTodayScreen({ status }: { status: DailyStatusResponse }) {
  const navigate = useNavigate()
  const hasQuestionSummary = status.totalCount > 0
  const hasXpSummary = Number.isFinite(status.xpEarned)
  const hasStreakSummary = Number.isFinite(status.streak)
  const summaryCount = [hasQuestionSummary, hasXpSummary, hasStreakSummary].filter(Boolean).length
  const summaryGridClass = summaryCount >= 3 ? 'grid-cols-3' : summaryCount === 2 ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' as const }}
        className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-3xl">✅</div>

        <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-gray-900">
          Bugünkü sualları tamamlamısan ✅
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
          Yeni suallar sabah gələcək. Bu gün isə kurslara davam edə, həftənin sirrinə baxa və ya nəticələrini izləyə bilərsən.
        </p>

        {(hasQuestionSummary || hasXpSummary || hasStreakSummary) && (
          <div className={`mt-6 grid ${summaryGridClass} gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3`}>
            {hasQuestionSummary && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-black tabular-nums text-gray-900">{status.answeredCount}/{status.totalCount}</span>
                <span className="text-[11px] text-gray-500">sual</span>
              </div>
            )}
            {hasXpSummary && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-black tabular-nums text-amber-500">+{status.xpEarned}</span>
                <span className="text-[11px] text-gray-500">XP</span>
              </div>
            )}
            {hasStreakSummary && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-black tabular-nums text-orange-500">🔥 {status.streak}</span>
                <span className="text-[11px] text-gray-500">gün sıra</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
            className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Dashboarda qayıt
          </button>
          <button
            onClick={() => navigate(APP_ROUTES.COURSES)}
            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Kurslara bax
          </button>
          <button
            onClick={() => navigate(APP_ROUTES.WEEKLY_MYSTERY)}
            className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
          >
            Həftənin sirri
          </button>
        </div>
      </motion.div>
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

  // Fetch daily status first; completed users should not call /daily questions.
  const {
    data: dailyStatus,
    isLoading: isDailyStatusLoading,
    isFetching: isDailyStatusFetching,
    isError: isDailyStatusError,
    refetch: refetchDailyStatus,
  } = useQuery<DailyStatusResponse>({
    queryKey: ['daily', 'status'],
    queryFn: () => api.get<{ data: DailyStatusResponse }>(API_ROUTES.DAILY.STATUS).then(r => r.data.data),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const dailyAnsweredCount = dailyStatus?.answeredCount ?? 0
  const dailyTotalCount = dailyStatus?.totalCount ?? 0
  const dailyCompleted = Boolean(
    dailyStatus?.completed || (dailyTotalCount > 0 && dailyAnsweredCount >= dailyTotalCount),
  )
  const canFetchDailyQuestions = Boolean(
    dailyStatus && !dailyCompleted && !isDailyStatusFetching && !isDailyStatusError,
  )

  // Fetch questions only after status says the daily quiz still has unanswered items.
  const {
    data: questions,
    isLoading: isQuestionsLoading,
    isError: isQuestionsError,
    refetch: refetchQuestions,
  } = useQuery<Question[]>({
    queryKey: ['daily', 'questions'],
    queryFn: () => questionService.fetchDaily(ageGroup),
    enabled: canFetchDailyQuestions,
    // staleTime 0: hər girişdə təzə sual dəsti gəlsin. Backend artıq bu gün cavablanmış
    // sualları çıxarır; köhnə cache re-serve etsə, onlara cavab "artıq cavab verilmişdir" 400 verirdi.
    staleTime: 0,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Sual səsi ayarı — real saxlanmış accessibility config-dən (App.tsx ilə eyni cache).
  const { data: a11yConfig } = useQuery<{ audioQuestions?: boolean }>({
    queryKey: ['accessibility', 'me'],
    queryFn: () => api.get<{ data: { audioQuestions?: boolean } }>(API_ROUTES.ACCESSIBILITY.ME).then((r) => r.data.data),
    enabled: !!user,
    staleTime: 1000 * 60,
  })
  const audioOn = a11yConfig?.audioQuestions === true

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
  const [submitError, setSubmitError] = useState(false)      // submit 400/şəbəkə xətası → taymeri dayandır, spam-ın qarşısını al


  const startTimeRef = useRef<number>(Date.now())

  const totalQuestions = questions?.length ?? 5
  const current = questions?.[currentIndex]
  const format = current?.format ?? 'A'
  const totalTime = current?.timeLimit ?? 30

  const goDashboard = useCallback(() => {
    navigate(APP_ROUTES.DASHBOARD.STUDENT)
  }, [navigate])

  const handleRetryDaily = useCallback(() => {
    if (canFetchDailyQuestions) {
      void refetchQuestions()
      return
    }

    void refetchDailyStatus()
  }, [canFetchDailyQuestions, refetchDailyStatus, refetchQuestions])

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
    setSubmitError(false)
    startTimeRef.current = Date.now()
  }, [currentIndex, current])

  // Countdown timer
  const handleTimeUp = useCallback(() => {
    if (isAnswered || phase !== 'question' || mutation.isPending || submitError) return
    handleAnswer('__timeout__') // boş cavab backend-də 400 verir, sentinel göndəririk
  }, [isAnswered, mutation.isPending, phase, submitError]) // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(
    () => {
      setTimeLeft(t => {
        if (t <= 1) { handleTimeUp(); return 0 }
        return t - 1
      })
    },
    phase === 'question' && !isAnswered && !submitError ? 1000 : null,
  )

  // Handle answer submission
  async function handleAnswer(answerInput: unknown) {
    if (isAnswered || mutation.isPending || !current) return

    const questionId = getQuestionId(current)
    const answer = normalizeAnswerInput(answerInput)

    if (!questionId) {
      toast.error('Sual ID tapılmadı. Səhifəni yeniləyib yenidən cəhd edin.')
      return
    }

    if (!answer) {
      toast.error('Cavab boş ola bilməz.')
      return
    }

    setSubmitError(false) // yeni cəhd → əvvəlki xəta kilidini sıfırla
    const responseTime = Math.floor((Date.now() - startTimeRef.current) / 1000)

    try {
      const res = await mutation.mutateAsync({
        questionId,
        answer,
        responseTime,
      })

      setSelectedAnswer(answer)
      setIsAnswered(true)
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

    } catch (err) {
      // Backend xətasını DÜRÜST göstər (məs. "Bu suala bu gün artıq cavab vermişsiniz").
      // Sabit id ilə tək toast → spam yoxdur. Eyni sualda qalırıq, cavablanmış kimi işarələnmir.
      const backendMessage =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : ''
      toast.error(backendMessage || 'Cavab göndərilmədi. Yenidən cəhd edin.', { id: 'daily-answer-error' })
      setSubmitError(true) // taymeri dayandırır → avtomatik təkrar POST/toast spam-ının qarşısını alır
      setSelectedAnswer(null)
      setIsAnswered(false)
      setShowMascot(false)
      setRevealedAnswer('')
      setPhase('question')
    }
  }

  // ── Render: loading (light premium) ──────────────────────────────────────

  if (isDailyStatusLoading || isDailyStatusFetching || (canFetchDailyQuestions && isQuestionsLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' as const }}
          className="w-14 h-14 rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${avatarColor} ${avatarColor}33 ${avatarColor}33 ${avatarColor}33` }}
        />
        <p className="text-gray-500 text-sm">Suallar yüklənir...</p>
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

  // ── Render: completed today ─────────────────────────────────────────────

  if (dailyCompleted && dailyStatus) {
    return <CompletedTodayScreen status={dailyStatus} />
  }

  // ── Render: boş / xəta (light premium) ──────────────────────────────────
  if (isDailyStatusError || isQuestionsError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-3xl">🧩</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Bugünkü suallar hazır deyil
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
            Hazırda gündəlik sualları yükləyə bilmədik. Bir azdan yenidən cəhd et və ya paneldən digər fəaliyyətlərə davam et.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleRetryDaily}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Yenidən cəhd et
          </button>
          <button
            onClick={() => navigate(APP_ROUTES.DASHBOARD.STUDENT)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Panelə qayıt
          </button>
        </div>
      </div>
    )
  }

  // ── Render: question (premium soft-navy focus stage) ─────────────────────

  const timerPct = totalTime > 0 ? timeLeft / totalTime : 0
  const timerColor = timerPct > 0.5 ? '#22C55E' : timerPct > 0.25 ? '#EAB308' : '#EF4444'
  const answerControlsLocked = isAnswered || mutation.isPending
  const progressPct = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: QUIZ_STAGE_BG }}>
      {/* ── Header ── */}
      <div className="shrink-0 px-4 lg:px-6 py-3 flex items-center gap-2 sm:gap-3 border-b border-white/10">
        <button
          onClick={handleExitQuiz}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <span className="hidden sm:inline">Panelə qayıt</span>
          <span className="sm:hidden">Çıxış</span>
        </button>

        {/* XP earned today */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
          <span className="text-sm leading-none">⭐</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: avatarColor }}>{totalXP}</span>
          <span className="text-[10px] text-slate-400">XP</span>
        </div>

        {/* Progress bar */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">Sual</span>
            <span className="text-[10px] font-semibold tabular-nums text-slate-300">
              {currentIndex + 1}/{totalQuestions}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: avatarColor }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' as const }}
            />
          </div>
        </div>

        {/* Hearts */}
        <div className="flex shrink-0 items-center gap-0.5">
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
              backgroundColor: `${timerColor}1f`,
            }}
          >
            {timeLeft}
          </div>
        )}
      </div>

      {/* ── Question area ── */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-2 overflow-hidden">
        {/* Sual səsi — yalnız ayar aktiv olanda; dəstək yoxdursa dürüst mesaj */}
        {audioOn && current && (
          <div className="mb-3 shrink-0">
            {SPEECH_SUPPORTED ? (
              <button
                type="button"
                onClick={() => speakQuestion(current.text)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                🔊 Sualı səsləndir
              </button>
            ) : (
              <p className="text-[11px] text-slate-400">Bu brauzer səsləndirməni dəstəkləmir.</p>
            )}
          </div>
        )}
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
                isAnswered={answerControlsLocked}
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
                isAnswered={answerControlsLocked}
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
                isAnswered={answerControlsLocked}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
            {format === 'D' && current && (
              <FormatD
                question={current}
                onAnswer={handleAnswer}
                isAnswered={answerControlsLocked}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
            {format === 'E' && current && (
              <FormatE
                question={current}
                onAnswer={handleAnswer}
                isAnswered={answerControlsLocked}
                correctAnswer={revealedAnswer}
                selectedAnswer={selectedAnswer}
                avatarColor={avatarColor}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Feedback popup ── */}
      <AnimatePresence>
        {showMascot && <FeedbackPopup correct={mascotCorrect} xp={lastXP} />}
      </AnimatePresence>

      {/* ── XP coins ── */}
      <XPCoins visible={showCoins} amount={lastXP} />

      {/* ── Age hint for children ── */}
      {isChild && !answerControlsLocked && (
        <div className="shrink-0 px-4 pb-4 text-center">
          <p className="text-slate-400 text-xs">Cavabını seç 👆</p>
        </div>
      )}
    </div>
  )
}
