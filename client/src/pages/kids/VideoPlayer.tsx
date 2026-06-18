import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { kidsService } from '../../services/kidsService'
import { APP_ROUTES } from '../../constants'
import Spinner from '../../components/Spinner'
import type { KidsAnswerResult } from '../../types'

// YouTube linkindən video ID-ni çıxarır (yoxdursa null → adi <video> player)
function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function VideoPlayer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Quiz vəziyyəti
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizIndices, setQuizIndices] = useState<number[]>([]) // bu sessiyada soruşulacaq sualların ORİJİNAL indeksləri
  const [step, setStep] = useState(0)                          // quizIndices içində neçənci sualdayıq
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<KidsAnswerResult | null>(null)

  // Nəticə ekranı
  const [finished, setFinished] = useState(false)
  const [sessionXp, setSessionXp] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  // Video bitdimi? (bitəndən sonra təkrar play olmasın)
  const [videoEnded, setVideoEnded] = useState(false)

  // ── Video ────────────────────────────────────────────────────────
  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['kids', 'video', id],
    queryFn: () => kidsService.getVideoById(id),
    enabled: !!id,
  })

  // ── İrəliləyiş (artıq cavablanmış sualları bilmək üçün) ──────────
  const { data: progress = [] } = useQuery({
    queryKey: ['kids', 'progress'],
    queryFn: kidsService.getMyProgress,
  })
  const myProgress = progress.find((p) => p.videoId?._id === id)
  const answeredSet = new Set(myProgress?.correctQuestions ?? [])

  // ── Baxış sayğacı (bir dəfə) ─────────────────────────────────────
  useEffect(() => {
    if (id) kidsService.incrementView(id).catch(() => {})
  }, [id])

  // ── Nəticə ekranı açılanda 5 saniyəyə avtomatik Hub-a yönləndir ──
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(() => navigate(APP_ROUTES.KIDS_HUB), 5000)
    return () => clearTimeout(t)
  }, [finished, navigate])

  // Sessiyanı bitir → progress keşini təzələ, nəticə ekranı göstər
  const finishSession = () => {
    qc.invalidateQueries({ queryKey: ['kids', 'progress'] })
    setShowQuiz(false)
    setFinished(true)
  }

  // ── "Bitirdim" → +10 XP, sonra cavablanmamış sualları topla ──────
  const completeMutation = useMutation({
    mutationFn: () => kidsService.complete(id),
    onSuccess: (data) => {
      if (data.xpEarned > 0) {
        toast.success(`Afərin! +${data.xpEarned} XP ⭐`)
        setSessionXp((x) => x + data.xpEarned)
      } else {
        toast('Bu videonu artıq bitirmisən ✓', { icon: '👍' })
      }
      // Yalnız ƏVVƏL doğru cavablanmamış suallar
      const pending = (video?.questions ?? [])
        .map((_, i) => i)
        .filter((i) => !answeredSet.has(i))
      setQuizIndices(pending)
      setStep(0)
      setSelected(null)
      setResult(null)
      if (pending.length > 0) setShowQuiz(true)
      else finishSession() // cavablanmamış sual yoxdursa birbaşa nəticə
    },
  })

  // ── Cavab ver ────────────────────────────────────────────────────
  const answerMutation = useMutation({
    mutationFn: (answer: number) => kidsService.answer(id, quizIndices[step], answer),
    onSuccess: (data) => {
      setResult(data)
      if (data.correct) {
        setCorrectCount((c) => c + 1)
        if (data.xpEarned > 0) {
          toast.success(`Doğru! +${data.xpEarned} XP ⭐`)
          setSessionXp((x) => x + data.xpEarned)
        } else {
          toast.success('Doğru! ✓')
        }
      } else {
        // Səhv cavab: XP YOXDUR (backend 0 qaytarır, progress yazılmır) — yalnız honest həvəsləndirmə.
        toast('Olur, növbəti dəfə! 💪', { icon: '🙂' })
      }
    },
  })

  // Növbəti sual (və ya sessiyanı bitir)
  const nextQuestion = () => {
    if (step + 1 < quizIndices.length) {
      setStep(step + 1)
      setSelected(null)
      setResult(null)
    } else {
      finishSession()
    }
  }

  // ── Yüklənmə / xəta halları ──────────────────────────────────────
  if (isLoading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-sky-50"><Spinner size="lg" /></div>
  }
  if (isError || !video) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-sky-50 text-slate-600">
        <div className="text-5xl mb-3">😕</div>
        <p className="font-bold mb-4">Video tapılmadı</p>
        <button onClick={() => navigate(APP_ROUTES.KIDS_HUB)} className="px-5 py-2 rounded-full bg-indigo-600 text-white font-bold">
          Geri qayıt
        </button>
      </div>
    )
  }

  const ytId = youtubeId(video.videoUrl)
  const question = video.questions[quizIndices[step]]

  // ── NƏTİCƏ EKRANI ────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-sky-50 text-center px-4">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-2">Təbriklər!</h1>
        <p className="text-slate-600 mb-1">Bu testdə <b className="text-green-600">+{sessionXp} XP</b> qazandın</p>
        {quizIndices.length > 0 && (
          <p className="text-slate-500 mb-6">{correctCount} / {quizIndices.length} doğru cavab</p>
        )}
        <button
          onClick={() => navigate(APP_ROUTES.KIDS_HUB)}
          className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-extrabold shadow-md transition-colors"
        >
          🎬 Başqa video seç →
        </button>
        <p className="text-xs text-slate-400 mt-4">5 saniyəyə avtomatik yönlənəcək...</p>
      </div>
    )
  }

  // ── ƏSAS EKRAN: video + lüğət + quiz ─────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50 to-indigo-50 text-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-6">

        <button onClick={() => navigate(APP_ROUTES.KIDS_HUB)} className="mb-4 text-indigo-600 font-bold hover:underline">
          ← Uşaq Klubu
        </button>
        <div className="aspect-video rounded-3xl overflow-hidden shadow-lg bg-black">
          {videoEnded ? (
            // Video bir dəfə bitdi → player əvəzinə bağlı ekran (təkrar play olmur)
            <div className="w-full h-full flex flex-col items-center justify-center text-center bg-slate-900 text-white">
              <div className="text-5xl mb-2">✅</div>
              <p className="font-bold">Videonu izlədin!</p>
              <p className="text-white/50 text-sm mt-1">Bu video yalnız bir dəfə izlənilir</p>
            </div>
          ) : ytId ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={video.titleAz || video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={video.videoUrl}
              controls
              playsInline
              controlsList="nodownload"
              onEnded={() => setVideoEnded(true)}
              className="w-full h-full"
            />
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-indigo-700 mt-4">{video.titleAz || video.title}</h1>

        {/* Lüğət */}
        {video.vocabulary.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-bold text-slate-500 mb-2">📚 Yeni sözlər</h2>
            <div className="flex flex-wrap gap-2">
              {video.vocabulary.map((word) => (
                <span key={word} className="bg-white rounded-full px-4 py-1.5 font-bold text-indigo-600 shadow-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* "Bitirdim" düyməsi — quiz başlamayıbsa */}
        {!showQuiz && (
          <button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="mt-6 w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60
                       text-white text-lg font-extrabold shadow-md transition-colors"
          >
            {completeMutation.isPending ? 'Saxlanılır...' : '✅ Videonu bitirdim!'}
          </button>
        )}

        {/* Quiz */}
        {showQuiz && question && (
          <div className="mt-6 bg-white rounded-3xl p-6 shadow-md">
            <div className="text-xs font-bold text-slate-400 mb-2">
              Sual {step + 1} / {quizIndices.length}
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-5">{question.q}</h3>

            <div className="space-y-3">
              {question.options.map((opt, i) => {
                const revealed = result !== null
                const isCorrect = revealed && i === result.correctAnswer
                const isWrongPick = revealed && i === selected && !result.correct
                return (
                  <button
                    key={i}
                    disabled={revealed || answerMutation.isPending}
                    onClick={() => { setSelected(i); answerMutation.mutate(i) }}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-colors ${
                      isCorrect ? 'bg-green-500 text-white'
                      : isWrongPick ? 'bg-red-400 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {result !== null && (
              <button
                onClick={nextQuestion}
                className="mt-5 w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
              >
                {step + 1 < quizIndices.length ? 'Növbəti sual →' : 'Bitir 🎉'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
