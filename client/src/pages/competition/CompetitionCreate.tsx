import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { competitionService, type RawQuestion } from '../../services/competitionService'
import { APP_ROUTES } from '../../constants'
import Spinner from '../../components/Spinner'

export default function CompetitionCreate() {
  const navigate = useNavigate()

  const { data: questions = [], isLoading } = useQuery<RawQuestion[]>({
    queryKey: ['questions', 'all'],
    queryFn:  () => competitionService.fetchQuestions(),
  })

  // Suallardan mövcud fənləri çıxar (təkrarsız)
  const subjects = useMemo(() => [...new Set(questions.map((q) => q.subject))], [questions])

  const [title,    setTitle]    = useState('Sürətli Yarış')
  const [subject,  setSubject]  = useState('')
  const [count,    setCount]    = useState(5)
  const [creating, setCreating] = useState(false)

  const activeSubject = subject || subjects[0] || ''
  const pool          = questions.filter((q) => q.subject === activeSubject)
  const maxCount      = Math.min(pool.length, 10)

  async function handleCreate() {
    if (title.trim().length < 3) return toast.error('Başlıq ən az 3 hərf olmalıdır')
    const ids = pool.slice(0, count).map((q) => q._id)
    if (ids.length === 0) return toast.error('Bu fəndə sual yoxdur')

    setCreating(true)
    try {
      const comp = await competitionService.create(title.trim(), ids)
      navigate(APP_ROUTES.COMPETITION.LOBBY(comp._id))
    } catch {
      toast.error('Yarış yaradıla bilmədi')
      setCreating(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]"><Spinner size="lg" /></div>
  }

  if (subjects.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#0D0D0D] text-center px-4">
        <span className="text-5xl">📭</span>
        <p className="text-white font-bold text-lg">Sual bazası boşdur</p>
        <p className="text-[#9CA3AF] text-sm">Əvvəlcə seed işlət ki, suallar yaransın.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-white font-black text-2xl mb-1">Yeni Yarış ⚔️</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">Fənn seç, sual sayını təyin et, başlat.</p>

      <label className="block text-sm text-[#9CA3AF] mb-1">Başlıq</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-white/30"
      />

      <label className="block text-sm text-[#9CA3AF] mb-1">Fənn</label>
      <select
        value={activeSubject}
        onChange={(e) => { setSubject(e.target.value); setCount(5) }}
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none"
      >
        {subjects.map((s) => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
      </select>

      <label className="block text-sm text-[#9CA3AF] mb-1">Sual sayı: {Math.min(count, maxCount)}</label>
      <input
        type="range" min={1} max={Math.max(1, maxCount)} value={Math.min(count, maxCount)}
        onChange={(e) => setCount(Number(e.target.value))}
        className="w-full mb-2 accent-purple-500"
      />
      <p className="text-[#6B7280] text-xs mb-6">Bu fəndə {pool.length} sual var.</p>

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #9333EA)' }}
      >
        {creating ? 'Yaradılır...' : 'Yarış Yarat 🚀'}
      </button>
    </div>
  )
}
