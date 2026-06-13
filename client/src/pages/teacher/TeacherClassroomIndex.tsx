import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'

// Sinif indeksi — müəllimin sinif sessiyaları (real /classroom/mine).
// "Sinifə daxil ol" mövcud /classroom/:id (ClassroomRoom) səhifəsinə aparır.

interface ClassroomItem {
  _id:          string
  title:        string
  status:       'scheduled' | 'live' | 'ended'
  scheduledAt?: string
  participants?: unknown[]
}

const STATUS_META: Record<ClassroomItem['status'], { label: string; cls: string }> = {
  scheduled: { label: 'Planlaşdırılıb', cls: 'bg-blue-500/20 text-blue-300' },
  live:      { label: '🔴 Canlı',        cls: 'bg-rose-500/20 text-rose-300' },
  ended:     { label: 'Bitib',           cls: 'bg-white/10 text-white/40' },
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function TeacherClassroomIndex() {
  const navigate = useNavigate()

  const { data: classrooms, isLoading, isError, refetch } = useQuery<ClassroomItem[]>({
    queryKey: ['classroom', 'mine'],
    queryFn: () => api.get<{ data: ClassroomItem[] }>('/classroom/mine').then(r => r.data.data),
  })

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">🏫 Sinif</h1>
          <p className="text-white/40 text-sm mt-0.5">Sinif sessiyalarınız — daxil olub canlı dərsi idarə edin</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-xl font-bold">Siniflər yüklənmədi</h2>
            <p className="text-white/50 text-sm max-w-xs">Zəhmət olmasa yenidən cəhd edin.</p>
            <button onClick={() => refetch()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
            >
              Yenidən yoxla
            </button>
          </div>
        ) : !classrooms || classrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-7xl">🏫</div>
            <h2 className="text-xl font-bold">Hələ sinif sessiyası yoxdur</h2>
            <p className="text-white/50 text-sm max-w-xs">Qruplarınızdan dərs sessiyası başladıqda burada görünəcək.</p>
            <button onClick={() => navigate('/groups')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
            >
              Qruplara keç
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {classrooms.map((c, i) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.scheduled
              const count = Array.isArray(c.participants) ? c.participants.length : 0
              const date = fmtDate(c.scheduledAt)
              return (
                <motion.div key={c._id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-[#141414] border border-white/10 rounded-2xl"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{c.title || 'Sinif'}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      👥 {count} iştirakçı{date && <> · 📅 {date}</>}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/classroom/${c._id}`)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors shrink-0"
                  >
                    Sinifə daxil ol →
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
