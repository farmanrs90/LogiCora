import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { kidsService } from '../../services/kidsService'
import { APP_ROUTES } from '../../constants'
import Spinner from '../../components/Spinner'
import type { AgeGroup } from '../../types'

// Saniyəni "3:05" formatına çevirir
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Uşaq səhifəsi üçün yalnız kiçik yaş qrupları
const KID_AGES: AgeGroup[] = ['3-5', '6-8']

export default function KidsHub() {
  const navigate = useNavigate()
  const [age, setAge] = useState<AgeGroup | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  // ── Kateqoriyalar (yuxarı rəngli düymələr) ──────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['kids', 'categories'],
    queryFn: kidsService.getCategories,
  })

  // ── Videolar (filtrlərə bağlı — filtr dəyişəndə avtomatik yenidən çəkilir) ──
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['kids', 'videos', category, age],
    queryFn: () =>
      kidsService.getVideos({
        category: category ?? undefined,
        ageGroup: age ?? undefined,
      }),
  })

  // ── Mənim irəliləyişim (XP + bitirdiyim videolar) ───────────────
  const { data: progress = [] } = useQuery({
    queryKey: ['kids', 'progress'],
    queryFn: kidsService.getMyProgress,
  })

  const totalXp = progress.reduce((sum, p) => sum + (p.xpEarned ?? 0), 0)
  const watchedIds = new Set(

    progress.filter((p) => p.watched && p.videoId).map((p) => p.videoId!._id),
  )
  // Bitirilmiş videoları siyahıdan çıxar — hər video yalnız bir dəfə izlənilir
  const visibleVideos = videos.filter((v) => !watchedIds.has(v._id))


  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50 to-indigo-50 text-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Başlıq + XP ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700">🎈 Uşaq Klubu</h1>
            <p className="text-slate-500 mt-1">Öyrən və əylən!</p>
          </div>
          <div className="bg-yellow-300 rounded-2xl px-5 py-3 shadow-md text-center">
            <div className="text-2xl font-extrabold text-yellow-800">⭐ {totalXp}</div>
            <div className="text-xs font-bold text-yellow-700">XP topladın</div>
          </div>
        </div>

        {/* ── Yaş filtri ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setAge(null)}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${age === null ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
          >
            Hamısı
          </button>
          {KID_AGES.map((a) => (
            <button
              key={a}
              onClick={() => setAge(a)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${age === a ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
            >
              {a} yaş
            </button>
          ))}
        </div>

        {/* ── Kateqoriya gridi ────────────────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-2xl py-4 flex flex-col items-center gap-1 font-bold text-sm transition-transform hover:scale-105 ${category === null ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 shadow-sm'
              }`}
          >
            <span className="text-2xl">🌈</span>
            Hamısı
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-2xl py-4 flex flex-col items-center gap-1 font-bold text-sm transition-transform hover:scale-105 ${category === c.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 shadow-sm'
                }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              {c.az}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="py-20"><Spinner size="lg" /></div>
        ) : visibleVideos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-3">{videos.length > 0 ? '🎉' : '🍿'}</div>
            <p className="text-slate-500 font-bold">
              {videos.length > 0
                ? 'Bütün videoları bitirdin! Afərin 👏'
                : age
                  ? 'Bu yaş qrupu üçün video hələ əlavə edilməyib.'
                  : category
                    ? 'Bu kateqoriya üçün video hələ əlavə edilməyib.'
                    : 'Hələ video əlavə edilməyib.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleVideos.map((v) => (
              <button
                key={v._id}
                onClick={() => navigate(APP_ROUTES.KIDS_VIDEO(v._id))}
                className="bg-white rounded-3xl overflow-hidden shadow-md text-left
                           transition-transform hover:scale-[1.03] hover:shadow-xl"
              >
                <div className="relative aspect-video bg-slate-200">
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt={v.titleAz} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                    {formatDuration(v.duration)}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 leading-tight">{v.titleAz || v.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">👁 {v.views} baxış</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
