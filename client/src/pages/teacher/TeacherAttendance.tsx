import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { API_ROUTES } from '../../constants'

// Davamiyyət — müəllimin qruplarının davamiyyət baxışı.
// Real /groups endpointindən gəlir; jurnal qeydiyyatı qrup idarəetməsində (/groups → Davamiyyət tab) aparılır.

interface AttendanceGroup {
  _id:        string
  name:       string
  studentIds?: unknown[]
  status?:    'active' | 'inactive' | 'archived'
  schedule?:  { day?: string; startTime?: string }
}

const DAY_AZ: Record<string, string> = {
  monday: 'B.e', tuesday: 'Ç.a', wednesday: 'Çər',
  thursday: 'C.a', friday: 'Cüm', saturday: 'Şnb', sunday: 'Baz',
}

function scheduleLabel(s?: AttendanceGroup['schedule']): string | null {
  if (!s || !s.day) return null
  const day = DAY_AZ[s.day] ?? s.day
  return s.startTime ? `${day} · ${s.startTime}` : day
}

export default function TeacherAttendance() {
  const navigate = useNavigate()

  const { data: groups, isLoading, isError, refetch } = useQuery<AttendanceGroup[]>({
    queryKey: ['attendance-groups'],
    queryFn: () => api.get<AttendanceGroup[]>(API_ROUTES.GROUPS.LIST).then(r => r.data),
  })

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">✅ Davamiyyət</h1>
          <p className="text-white/40 text-sm mt-0.5">Qrupu seçib davamiyyət jurnalını qeyd edin</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-xl font-bold">Qruplar yüklənmədi</h2>
            <p className="text-white/50 text-sm max-w-xs">Zəhmət olmasa yenidən cəhd edin.</p>
            <button onClick={() => refetch()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
            >
              Yenidən yoxla
            </button>
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-7xl">👥</div>
            <h2 className="text-xl font-bold">Hələ qrup yoxdur</h2>
            <p className="text-white/50 text-sm max-w-xs">Davamiyyət qeyd etmək üçün əvvəlcə qrup yaradın.</p>
            <button onClick={() => navigate('/groups')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors"
            >
              Qruplara keç
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g, i) => {
              const memberCount = Array.isArray(g.studentIds) ? g.studentIds.length : 0
              const sched = scheduleLabel(g.schedule)
              const isActive = (g.status ?? 'active') === 'active'
              return (
                <motion.div key={g._id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm">{g.name || 'Qrup'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                      {isActive ? 'Aktiv' : 'Passiv'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span>👥 {memberCount} tələbə</span>
                    {sched && (<><span>·</span><span>📅 {sched}</span></>)}
                  </div>
                  <button onClick={() => navigate('/groups')}
                    className="w-full mt-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors"
                  >
                    📋 Davamiyyət jurnalı →
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
