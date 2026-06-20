import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Role } from '../../types'

// ── Types (backend GET /api/admin/overview ilə eyni şəkil) ──────────────────

interface AdminRecentUser {
  _id: string
  name: string
  surname: string
  email: string
  role: Role
  createdAt?: string
}

interface AdminRecentCourse {
  _id: string
  title: string
  category: string
  isPublished: boolean
  createdAt?: string
}

interface AdminOverview {
  totalUsers: number
  usersByRole: Record<string, number>
  recentUsers: AdminRecentUser[]
  courses: { total: number; recent: AdminRecentCourse[] }
  groups: { total: number }
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  student: { label: 'Şagird', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  teacher: { label: 'Müəllim', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  parent: { label: 'Valideyn', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  admin: { label: 'Admin', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  manager: { label: 'Menecer', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
}

// Hələ backend dəstəyi olmayan idarəetmə bölmələri — dürüst "Tezliklə" (klikləncək deyil)
const READINESS = [
  { icon: '👥', title: 'İstifadəçi idarəetməsi', desc: 'Hesab axtarışı, baxış və status' },
  { icon: '🔐', title: 'Rol və icazələr', desc: 'Rol təyini və icazə tənzimləmələri' },
  { icon: '📚', title: 'Kurs moderasiyası', desc: 'Kursların yoxlanışı və təsdiqi' },
  { icon: '📨', title: 'Təklif və iradlar', desc: 'İstifadəçi geri-bildirimləri' },
]

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value.toLocaleString('az-AZ')}</p>
    </div>
  )
}

export default function Admin() {
  const { data, isLoading, isError, refetch } = useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<{ data: AdminOverview }>('/admin/overview').then(r => r.data.data),
  })

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Admin panel</h1>
          <p className="mt-1 text-sm text-gray-600">
            Platforma istifadəçiləri, rollar və demo hazırlığını real məlumatlarla izləyin.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-white border border-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-72 bg-white border border-gray-200 rounded-2xl animate-pulse" />
          </div>
        ) : isError ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm space-y-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-gray-600 text-sm">Admin məlumatları yüklənmədi.</p>
            <button onClick={() => refetch()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              Yenidən yoxla
            </button>
          </div>
        ) : data ? (
          <>
            {/* Stat cards — real saylar */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard label="Ümumi istifadəçi" value={data.totalUsers} accent="text-gray-900" />
                <StatCard label="Şagirdlər" value={data.usersByRole.student ?? 0} accent="text-indigo-600" />
                <StatCard label="Müəllimlər" value={data.usersByRole.teacher ?? 0} accent="text-emerald-600" />
                <StatCard label="Valideynlər" value={data.usersByRole.parent ?? 0} accent="text-amber-600" />
                <StatCard label="Kurslar" value={data.courses.total} accent="text-blue-600" />
                <StatCard label="Qruplar" value={data.groups.total} accent="text-violet-600" />
              </div>
              <p className="text-xs text-gray-400">
                Sistem hesabları: {(data.usersByRole.admin ?? 0).toLocaleString('az-AZ')} admin · {(data.usersByRole.manager ?? 0).toLocaleString('az-AZ')} menecer
              </p>
            </div>

            {/* Recent users + recent courses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent users */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Son qeydiyyatlar</h2>
                  <span className="text-xs text-gray-400">{data.recentUsers.length} istifadəçi</span>
                </div>
                {data.recentUsers.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">Hələ istifadəçi yoxdur.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.recentUsers.map((u) => {
                      const badge = ROLE_BADGE[u.role] ?? { label: u.role, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
                      return (
                        <li key={u._id} className="flex items-center gap-3 p-4">
                          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                            {(u.name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.name} {u.surname}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                          <span className="hidden sm:block shrink-0 w-24 text-right text-xs text-gray-400">{fmtDate(u.createdAt)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Recent courses */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Son kurslar</h2>
                </div>
                {data.courses.recent.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">Hələ kurs yoxdur.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.courses.recent.map((c) => (
                      <li key={c._id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${c.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-gray-500 border-gray-200'}`}>
                            {c.isPublished ? 'Yayımda' : 'Qaralama'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{c.category} · {fmtDate(c.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Management readiness — disabled / post-demo (klikləncək deyil) */}
            <div>
              <h2 className="font-bold text-gray-900">İdarəetmə</h2>
              <p className="mt-1 mb-4 text-xs text-gray-500">Bu bölmələr demo-dan sonra aktivləşəcək — hazırda yalnız baxış rejimi mövcuddur.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {READINESS.map((r) => (
                  <div key={r.title} aria-disabled="true"
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm opacity-70 cursor-not-allowed select-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-gray-500 flex items-center justify-center text-lg shrink-0">{r.icon}</div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-700">{r.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Tezliklə</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
