import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Role } from '../../types'

// ── Types (backend admin endpointləri ilə eyni şəkil) ───────────────────────

interface AdminOverview {
  totalUsers: number
  usersByRole: Record<string, number>
  courses: { total: number }
  groups: { total: number }
}

interface AdminUser {
  _id: string
  name: string
  surname: string
  email: string
  role: Role
  ageGroup?: string
  createdAt?: string
}

interface AdminCourse {
  _id: string
  title: string
  category?: string
  level?: string
  isPublished?: boolean
  price?: number
  teacher?: string | null
  createdAt?: string
}

interface AdminGroup {
  _id: string
  name: string
  status?: string
  studentCount?: number
  teacher?: string | null
  createdAt?: string
}

interface Paged<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface AdminFeedbackUser {
  _id: string
  name: string | null
  email: string | null
  role: string | null
}

interface AdminFeedback {
  _id: string
  category: string
  type: string
  title: string
  message: string
  priority: string
  status: string
  adminNote: string
  role: string
  createdAt?: string
  handledAt?: string | null
  user: AdminFeedbackUser | null
  handledBy?: string | null
}

type Tab = 'users' | 'courses' | 'groups' | 'feedback' | 'centers' | 'management'

type DrawerState =
  | { type: 'user'; user: AdminUser }
  | { type: 'course'; course: AdminCourse }
  | { type: 'group'; group: AdminGroup }
  | null

// ── Sabitlər ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  student: { label: 'Şagird', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  teacher: { label: 'Müəllim', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  parent: { label: 'Valideyn', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  admin: { label: 'Admin', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  manager: { label: 'Menecer', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Başlanğıc',
  intermediate: 'Orta',
  advanced: 'Yüksək',
}

const USER_ROLE_CHIPS: { value: string; label: string }[] = [
  { value: '', label: 'Hamısı' },
  { value: 'student', label: 'Şagird' },
  { value: 'teacher', label: 'Müəllim' },
  { value: 'parent', label: 'Valideyn' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Menecer' },
]

const COURSE_STATUS_CHIPS: { value: string; label: string }[] = [
  { value: '', label: 'Hamısı' },
  { value: 'published', label: 'Yayımda' },
  { value: 'draft', label: 'Qaralama' },
]

// ── Feedback sabitləri ───────────────────────────────────────────────────────

const FB_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Yeni', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  reviewing: { label: 'Baxılır', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Həll olundu', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rədd edildi', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const FB_TYPE: Record<string, string> = {
  suggestion: 'Təklif', complaint: 'Şikayət', bug: 'Səhv', improvement: 'Təkmilləşdirmə',
}

const FB_CATEGORY: Record<string, string> = {
  ui: 'İnterfeys', lesson: 'Dərs', teacher: 'Müəllim', payment: 'Ödəniş',
  technical: 'Texniki', accessibility: 'Əlçatımlılıq', suggestion: 'Təklif', other: 'Digər',
}

const FB_PRIORITY: Record<string, string> = { low: 'Aşağı', medium: 'Orta', high: 'Yüksək' }

const FB_STATUS_CHIPS: { value: string; label: string }[] = [
  { value: '', label: 'Hamısı' },
  { value: 'new', label: 'Yeni' },
  { value: 'reviewing', label: 'Baxılır' },
  { value: 'resolved', label: 'Həll olundu' },
  { value: 'rejected', label: 'Rədd edildi' },
]

const FB_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Bütün kateqoriyalar' },
  ...Object.entries(FB_CATEGORY).map(([value, label]) => ({ value, label })),
]

const selectCls =
  'bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors'

function fbStatusBadge(s: string) {
  return FB_STATUS[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
}

// Backend xəta mesajını dürüst göstər (validation errors[] və ya message).
function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = err && typeof err === 'object' && 'response' in err ? (err as { response?: unknown }).response : null
  if (!response || typeof response !== 'object') return fallback
  const data = 'data' in response ? (response as { data?: unknown }).data : null
  if (!data || typeof data !== 'object') return fallback
  if ('errors' in data && Array.isArray((data as { errors?: unknown[] }).errors) && (data as { errors: unknown[] }).errors.length) {
    const first = (data as { errors: unknown[] }).errors[0]
    if (typeof first === 'string' && first.trim()) return first
  }
  if ('message' in data && typeof (data as { message?: unknown }).message === 'string' && (data as { message: string }).message.trim()) {
    return (data as { message: string }).message
  }
  return fallback
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function roleBadge(role: string) {
  return ROLE_BADGE[role] ?? { label: role, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
}

// Yazma fasiləsi — hər hərfdə sorğu atmamaq üçün
function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// ── Kiçik UI komponentləri ───────────────────────────────────────────────────

function StatCard({ label, value, accent, active, onClick }: {
  label: string; value: number; accent: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`text-left bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value.toLocaleString('az-AZ')}</p>
      <p className="mt-1 text-[11px] text-indigo-600">Bax →</p>
    </button>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full sm:max-w-xs bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-colors"
    />
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {children}
    </button>
  )
}

function StateBlock({ kind, onRetry }: { kind: 'loading' | 'error' | 'empty'; onRetry?: () => void }) {
  if (kind === 'loading') {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 border border-gray-200 rounded-xl animate-pulse" />)}
      </div>
    )
  }
  if (kind === 'error') {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm text-gray-600">Məlumat yüklənmədi.</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Yenidən yoxla</button>
        )}
      </div>
    )
  }
  return <div className="py-12 text-center text-sm text-gray-400">Nəticə tapılmadı.</div>
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right break-words min-w-0">{value}</span>
    </div>
  )
}

// ── Detail drawer (read-only) ────────────────────────────────────────────────

function DetailDrawer({ state, onClose }: { state: DrawerState; onClose: () => void }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog" aria-modal="true"
        >
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
              <h2 className="font-bold text-gray-900">
                {state.type === 'user' ? 'İstifadəçi məlumatı' : state.type === 'course' ? 'Kurs məlumatı' : 'Qrup məlumatı'}
              </h2>
              <button onClick={onClose} aria-label="Bağla"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {state.type === 'user' && (
                <>
                  <div className="flex items-center gap-3 pb-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                      {(state.user.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{state.user.name} {state.user.surname}</p>
                      <p className="text-xs text-gray-500 truncate">{state.user.email}</p>
                    </div>
                  </div>
                  <Row label="Rol" value={<span className={`text-[11px] px-2 py-0.5 rounded-full border ${roleBadge(state.user.role).cls}`}>{roleBadge(state.user.role).label}</span>} />
                  <Row label="Yaş qrupu" value={state.user.ageGroup || '—'} />
                  <Row label="Qeydiyyat" value={fmtDate(state.user.createdAt)} />
                  <Row label="ID" value={<span className="font-mono text-xs text-gray-500">{state.user._id}</span>} />
                </>
              )}

              {state.type === 'course' && (
                <>
                  <p className="pb-3 text-lg font-bold text-gray-900">{state.course.title}</p>
                  <Row label="Status" value={
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${state.course.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-gray-500 border-gray-200'}`}>
                      {state.course.isPublished ? 'Yayımda' : 'Qaralama'}
                    </span>
                  } />
                  <Row label="Kateqoriya" value={state.course.category || '—'} />
                  <Row label="Səviyyə" value={state.course.level ? (LEVEL_LABELS[state.course.level] ?? state.course.level) : '—'} />
                  <Row label="Qiymət" value={state.course.price != null ? `${state.course.price} ₼` : '—'} />
                  <Row label="Müəllim" value={state.course.teacher || '—'} />
                  <Row label="Yaradılıb" value={fmtDate(state.course.createdAt)} />
                  <Row label="ID" value={<span className="font-mono text-xs text-gray-500">{state.course._id}</span>} />
                </>
              )}

              {state.type === 'group' && (
                <>
                  <p className="pb-3 text-lg font-bold text-gray-900">{state.group.name}</p>
                  <Row label="Status" value={state.group.status || '—'} />
                  <Row label="Müəllim" value={state.group.teacher || '—'} />
                  <Row label="Şagird sayı" value={state.group.studentCount ?? 0} />
                  <Row label="Yaradılıb" value={fmtDate(state.group.createdAt)} />
                  <Row label="ID" value={<span className="font-mono text-xs text-gray-500">{state.group._id}</span>} />
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ role, setRole, onOpen }: { role: string; setRole: (r: string) => void; onOpen: (u: AdminUser) => void }) {
  const [q, setQ] = useState('')
  const qd = useDebounced(q)

  const { data, isLoading, isError, refetch } = useQuery<Paged<AdminUser>>({
    queryKey: ['admin', 'users', role, qd],
    queryFn: () => api.get<{ data: Paged<AdminUser> }>('/admin/users', {
      params: { role: role || undefined, q: qd || undefined, limit: 50 },
    }).then((r) => r.data.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Ad, soyad və ya email axtar..." />
        <div className="flex flex-wrap gap-2">
          {USER_ROLE_CHIPS.map((c) => (
            <Chip key={c.value} active={role === c.value} onClick={() => setRole(c.value)}>{c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">İstifadəçilər</h2>
          {data && <span className="text-xs text-gray-400">Cəmi: {data.total.toLocaleString('az-AZ')}</span>}
        </div>
        {isLoading ? <StateBlock kind="loading" />
          : isError ? <StateBlock kind="error" onRetry={() => refetch()} />
          : data && data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.items.map((u) => (
                <li key={u._id}>
                  <button onClick={() => onOpen(u)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {(u.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name} {u.surname}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${roleBadge(u.role).cls}`}>{roleBadge(u.role).label}</span>
                    <span className="hidden sm:block shrink-0 w-24 text-right text-xs text-gray-400">{fmtDate(u.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <StateBlock kind="empty" />}
        {data && data.total > data.items.length && (
          <p className="px-4 py-3 text-center text-[11px] text-gray-400 border-t border-gray-100">İlk {data.items.length} nəticə göstərilir ({data.total.toLocaleString('az-AZ')} cəmi).</p>
        )}
      </div>
    </div>
  )
}

// ── Courses tab ──────────────────────────────────────────────────────────────

function CoursesTab({ status, setStatus, onOpen }: { status: string; setStatus: (s: string) => void; onOpen: (c: AdminCourse) => void }) {
  const [q, setQ] = useState('')
  const qd = useDebounced(q)

  const { data, isLoading, isError, refetch } = useQuery<Paged<AdminCourse>>({
    queryKey: ['admin', 'courses', status, qd],
    queryFn: () => api.get<{ data: Paged<AdminCourse> }>('/admin/courses', {
      params: { status: status || undefined, q: qd || undefined, limit: 50 },
    }).then((r) => r.data.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Kurs adı və ya kateqoriya axtar..." />
        <div className="flex flex-wrap gap-2">
          {COURSE_STATUS_CHIPS.map((c) => (
            <Chip key={c.value} active={status === c.value} onClick={() => setStatus(c.value)}>{c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">Kurslar</h2>
          {data && <span className="text-xs text-gray-400">Cəmi: {data.total.toLocaleString('az-AZ')}</span>}
        </div>
        {isLoading ? <StateBlock kind="loading" />
          : isError ? <StateBlock kind="error" onRetry={() => refetch()} />
          : data && data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.items.map((c) => (
                <li key={c._id}>
                  <button onClick={() => onOpen(c)}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.category || '—'}{c.teacher ? ` · ${c.teacher}` : ''} · {fmtDate(c.createdAt)}
                      </p>
                    </div>
                    {c.price != null && <span className="shrink-0 text-xs font-semibold text-gray-700">{c.price} ₼</span>}
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${c.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-gray-500 border-gray-200'}`}>
                      {c.isPublished ? 'Yayımda' : 'Qaralama'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <StateBlock kind="empty" />}
        {data && data.total > data.items.length && (
          <p className="px-4 py-3 text-center text-[11px] text-gray-400 border-t border-gray-100">İlk {data.items.length} nəticə göstərilir ({data.total.toLocaleString('az-AZ')} cəmi).</p>
        )}
      </div>
    </div>
  )
}

// ── Groups tab ───────────────────────────────────────────────────────────────

function GroupsTab({ onOpen }: { onOpen: (g: AdminGroup) => void }) {
  const { data, isLoading, isError, refetch } = useQuery<Paged<AdminGroup>>({
    queryKey: ['admin', 'groups'],
    queryFn: () => api.get<{ data: Paged<AdminGroup> }>('/admin/groups', { params: { limit: 50 } }).then((r) => r.data.data),
  })

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-sm">Qruplar</h2>
        {data && <span className="text-xs text-gray-400">Cəmi: {data.total.toLocaleString('az-AZ')}</span>}
      </div>
      {isLoading ? <StateBlock kind="loading" />
        : isError ? <StateBlock kind="error" onRetry={() => refetch()} />
        : data && data.items.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {data.items.map((g) => (
              <li key={g._id}>
                <button onClick={() => onOpen(g)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">
                    {(g.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {g.teacher ? `${g.teacher} · ` : ''}{(g.studentCount ?? 0).toLocaleString('az-AZ')} şagird · {fmtDate(g.createdAt)}
                    </p>
                  </div>
                  {g.status && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border bg-slate-100 text-gray-500 border-gray-200">{g.status}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : <StateBlock kind="empty" />}
      {data && data.total > data.items.length && (
        <p className="px-4 py-3 text-center text-[11px] text-gray-400 border-t border-gray-100">İlk {data.items.length} nəticə göstərilir ({data.total.toLocaleString('az-AZ')} cəmi).</p>
      )}
    </div>
  )
}

// ── Feedback drawer (admin — status/qeyd yenilənir) ──────────────────────────

function FeedbackDrawer({ item, onClose, onUpdated }: { item: AdminFeedback; onClose: () => void; onUpdated: (u: AdminFeedback) => void }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(item.status)
  const [adminNote, setAdminNote] = useState(item.adminNote ?? '')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.patch<{ data: AdminFeedback }>(`/feedback/admin/${item._id}/status`, { status, adminNote })
      .then((r) => r.data.data),
    onSuccess: (updated) => {
      setErr('')
      setOk(true)
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] })
      onUpdated(updated)
      setTimeout(() => setOk(false), 2000)
    },
    onError: (e: unknown) => { setOk(false); setErr(getApiErrorMessage(e, 'Status yenilənmədi. Yenidən cəhd edin.')) },
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog" aria-modal="true"
    >
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <h2 className="font-bold text-gray-900">Təklif / İrad detalı</h2>
          <button onClick={onClose} aria-label="Bağla"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <p className="pb-2 text-lg font-bold text-gray-900 break-words">{item.title}</p>
          <div className="flex flex-wrap gap-2 pb-3">
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-gray-600 border-gray-200">{FB_TYPE[item.type] ?? item.type}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-gray-600 border-gray-200">{FB_CATEGORY[item.category] ?? item.category}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${fbStatusBadge(item.status).cls}`}>{fbStatusBadge(item.status).label}</span>
          </div>

          <Row label="Göndərən" value={item.user?.name || '—'} />
          <Row label="Email" value={item.user?.email || '—'} />
          <Row label="Rol" value={item.user?.role ? (roleBadge(item.user.role).label) : (roleBadge(item.role).label)} />
          <Row label="Prioritet" value={FB_PRIORITY[item.priority] ?? item.priority} />
          <Row label="Tarix" value={fmtDate(item.createdAt)} />
          {item.handledBy && <Row label="Baxan admin" value={item.handledBy} />}

          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Mesaj</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-gray-200 p-3">{item.message}</p>
          </div>

          {/* Status / admin qeyd yeniləmə */}
          <div className="mt-5 border-t border-gray-100 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} w-full`}>
                {Object.entries(FB_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin qeydi</label>
              <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} maxLength={2000}
                placeholder="İstifadəçiyə görünən qeyd (istəyə bağlı)" className={`${selectCls} w-full resize-none`} />
            </div>
            {err && <p className="text-xs text-rose-600">{err}</p>}
            <div className="flex items-center gap-3">
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                {mutation.isPending ? 'Saxlanılır...' : 'Yadda saxla'}
              </button>
              {ok && <span className="text-sm text-emerald-600 font-medium">✓ Yeniləndi</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Feedback tab (admin) ─────────────────────────────────────────────────────

function FeedbackTab() {
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const qd = useDebounced(q)
  const [selected, setSelected] = useState<AdminFeedback | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<Paged<AdminFeedback>>({
    queryKey: ['admin', 'feedback', status, role, category, qd],
    queryFn: () => api.get<{ data: Paged<AdminFeedback> }>('/feedback/admin', {
      params: { status: status || undefined, role: role || undefined, category: category || undefined, q: qd || undefined, limit: 50 },
    }).then((r) => r.data.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={q} onChange={setQ} placeholder="Başlıq və ya mesaj axtar..." />
          <div className="flex flex-wrap gap-2">
            {FB_STATUS_CHIPS.map((c) => (
              <Chip key={c.value} active={status === c.value} onClick={() => setStatus(c.value)}>{c.label}</Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls} aria-label="Rol filtri">
            <option value="">Bütün rollar</option>
            {USER_ROLE_CHIPS.filter((c) => c.value).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} aria-label="Kateqoriya filtri">
            {FB_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">Təklif və İradlar</h2>
          {data && <span className="text-xs text-gray-400">Cəmi: {data.total.toLocaleString('az-AZ')}</span>}
        </div>
        {isLoading ? <StateBlock kind="loading" />
          : isError ? <StateBlock kind="error" onRetry={() => refetch()} />
          : data && data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.items.map((f) => (
                <li key={f._id}>
                  <button onClick={() => setSelected(f)}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(FB_TYPE[f.type] ?? f.type)} · {(FB_CATEGORY[f.category] ?? f.category)} · {roleBadge(f.role).label}{fmtDate(f.createdAt) !== '—' ? ` · ${fmtDate(f.createdAt)}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${fbStatusBadge(f.status).cls}`}>{fbStatusBadge(f.status).label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <StateBlock kind="empty" />}
        {data && data.total > data.items.length && (
          <p className="px-4 py-3 text-center text-[11px] text-gray-400 border-t border-gray-100">İlk {data.items.length} nəticə göstərilir ({data.total.toLocaleString('az-AZ')} cəmi).</p>
        )}
      </div>

      <AnimatePresence>
        {selected && <FeedbackDrawer item={selected} onClose={() => setSelected(null)} onUpdated={(u) => setSelected(u)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Center applications (admin təsdiq axını) ─────────────────────────────────

interface AdminCenterApplication {
  _id: string
  centerName: string
  centerType: string
  taxIdOrVoen: string
  contactName: string
  phone: string
  address: string
  city: string
  description: string
  documentUrl: string
  status: string
  adminNote: string
  applicantName: string
  applicantEmail: string
  applicantRole: string
  createdAt?: string
  createdCenterId?: string | null
}

const CA_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Gözləyir', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Təsdiqləndi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rədd edildi', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}
function caStatusBadge(s: string) {
  return CA_STATUS[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
}
const CA_STATUS_CHIPS: { value: string; label: string }[] = [
  { value: '', label: 'Hamısı' },
  { value: 'pending', label: 'Gözləyir' },
  { value: 'approved', label: 'Təsdiqləndi' },
  { value: 'rejected', label: 'Rədd edildi' },
]
const CA_TYPE: Record<string, string> = {
  individual_teacher: 'Fərdi müəllim',
  course_center: 'Hazırlıq / kurs mərkəzi',
  school_or_org: 'Məktəb / təşkilat',
}

function CenterApplicationDrawer({ item, onClose }: { item: AdminCenterApplication; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [adminNote, setAdminNote] = useState(item.adminNote ?? '')
  const [err, setErr] = useState('')
  const [doneMsg, setDoneMsg] = useState('')
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [markVerified, setMarkVerified] = useState(false)

  // verified yalnız real sənəd (VÖEN/documentUrl) olduqda mümkündür — fake verification yox.
  const hasProof = Boolean((item.taxIdOrVoen && item.taxIdOrVoen.trim()) || (item.documentUrl && item.documentUrl.trim()))

  const reviewMutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      api.patch<{ data: { center: { joinCode: string } | null } }>(`/centers/applications/${item._id}/review`, {
        status,
        adminNote,
        ...(status === 'approved' ? { verificationLevel: markVerified && hasProof ? 'verified' : 'basic' } : {}),
      }).then((r) => r.data.data),
    onSuccess: (res, status) => {
      setErr('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'center-applications'] })
      if (status === 'approved') {
        setJoinCode(res?.center?.joinCode ?? null)
        setDoneMsg('Mərkəz yaradıldı və müraciət təsdiqləndi.')
      } else {
        setDoneMsg('Müraciət rədd edildi.')
      }
    },
    onError: (e: unknown) => setErr(getApiErrorMessage(e, 'Əməliyyat alınmadı. Yenidən cəhd edin.')),
  })

  const showActions = item.status === 'pending' && !doneMsg

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog" aria-modal="true"
    >
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <h2 className="font-bold text-gray-900">Mərkəz müraciəti</h2>
          <button onClick={onClose} aria-label="Bağla"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <p className="pb-2 text-lg font-bold text-gray-900 break-words">{item.centerName}</p>
          <div className="pb-3">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${caStatusBadge(item.status).cls}`}>{caStatusBadge(item.status).label}</span>
          </div>

          <Row label="Növ" value={CA_TYPE[item.centerType] ?? item.centerType ?? '—'} />
          <Row label="Göndərən" value={item.applicantName || '—'} />
          <Row label="Email" value={item.applicantEmail || '—'} />
          <Row label="Telefon" value={item.phone || '—'} />
          <Row label="Ünvan" value={item.address || '—'} />
          <Row label="Şəhər" value={item.city || '—'} />
          <Row label="VÖEN / sənəd" value={item.taxIdOrVoen || '—'} />
          <Row label="Əlaqə şəxsi" value={item.contactName || '—'} />
          <Row label="Sənəd" value={item.documentUrl
            ? <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 break-all">Bax →</a>
            : '—'} />
          <Row label="Tarix" value={fmtDate(item.createdAt)} />

          {item.description && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Təsvir</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-gray-200 p-3">{item.description}</p>
            </div>
          )}

          {joinCode && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[11px] text-emerald-700 mb-0.5">Yaradılmış qoşulma kodu</p>
              <span className="font-mono text-sm font-bold text-gray-900 tracking-wider">{joinCode}</span>
            </div>
          )}

          {showActions ? (
            <div className="mt-5 border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin qeydi (istəyə bağlı)</label>
                <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} maxLength={1000}
                  className={`${selectCls} w-full resize-none`} placeholder="Rədd səbəbi və ya qeyd" />
              </div>
              {/* Təsdiq səviyyəsi — verified yalnız VÖEN/sənəd olduqda */}
              {hasProof ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={markVerified} onChange={(e) => setMarkVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Təsdiqlənmiş (verified) kimi qeyd et
                </label>
              ) : (
                <p className="text-[11px] text-gray-400">VÖEN/sənəd olmadığı üçün təsdiq “əsas” (basic) səviyyə ilə aparılacaq.</p>
              )}
              {err && <p className="text-xs text-rose-600">{err}</p>}
              <div className="flex items-center gap-3">
                <button onClick={() => reviewMutation.mutate('approved')} disabled={reviewMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {reviewMutation.isPending ? '...' : 'Təsdiqlə'}
                </button>
                <button onClick={() => reviewMutation.mutate('rejected')} disabled={reviewMutation.isPending}
                  className="px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-sm font-semibold transition-colors hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Rədd et
                </button>
              </div>
            </div>
          ) : doneMsg ? (
            <p className="mt-4 text-sm font-medium text-emerald-700">{doneMsg}</p>
          ) : item.status !== 'pending' ? (
            <p className="mt-4 text-xs text-gray-400">Bu müraciət artıq baxılıb.{item.adminNote ? ` Qeyd: ${item.adminNote}` : ''}</p>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

function CenterApplicationsTab() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const qd = useDebounced(q)
  const [selected, setSelected] = useState<AdminCenterApplication | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<Paged<AdminCenterApplication>>({
    queryKey: ['admin', 'center-applications', status, qd],
    queryFn: () => api.get<{ data: Paged<AdminCenterApplication> }>('/centers/applications', {
      params: { status: status || undefined, q: qd || undefined, limit: 50 },
    }).then((r) => r.data.data),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Mərkəz adı, ad və ya email axtar..." />
        <div className="flex flex-wrap gap-2">
          {CA_STATUS_CHIPS.map((c) => (
            <Chip key={c.value} active={status === c.value} onClick={() => setStatus(c.value)}>{c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">Mərkəz müraciətləri</h2>
          {data && <span className="text-xs text-gray-400">Cəmi: {data.total.toLocaleString('az-AZ')}</span>}
        </div>
        {isLoading ? <StateBlock kind="loading" />
          : isError ? <StateBlock kind="error" onRetry={() => refetch()} />
          : data && data.items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.items.map((a) => (
                <li key={a._id}>
                  <button onClick={() => setSelected(a)}
                    className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.centerName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.applicantName || a.applicantEmail || '—'}{fmtDate(a.createdAt) !== '—' ? ` · ${fmtDate(a.createdAt)}` : ''}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${caStatusBadge(a.status).cls}`}>{caStatusBadge(a.status).label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <StateBlock kind="empty" />}
        {data && data.total > data.items.length && (
          <p className="px-4 py-3 text-center text-[11px] text-gray-400 border-t border-gray-100">İlk {data.items.length} nəticə göstərilir ({data.total.toLocaleString('az-AZ')} cəmi).</p>
        )}
      </div>

      <AnimatePresence>
        {selected && <CenterApplicationDrawer item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Management tab ───────────────────────────────────────────────────────────

function ManagementTab({ onUsers, onCourses, onFeedback }: { onUsers: () => void; onCourses: () => void; onFeedback: () => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Aktiv (read-only) — mövcud tab-a keçir */}
      <button onClick={onUsers}
        className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-lg text-indigo-600">👥</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">İstifadəçi idarəetməsi</p>
              <p className="text-xs text-gray-500 mt-0.5">İstifadəçiləri oxu rejimində gör</p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-indigo-600 font-medium">Bax →</span>
        </div>
      </button>

      <button onClick={onCourses}
        className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg text-blue-600">📚</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">Kurs moderasiyası</p>
              <p className="text-xs text-gray-500 mt-0.5">Kursları oxu rejimində gör</p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-indigo-600 font-medium">Bax →</span>
        </div>
      </button>

      <button onClick={onFeedback}
        className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg text-amber-600">📨</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">Təklif və iradlar</p>
              <p className="text-xs text-gray-500 mt-0.5">İstifadəçi geri-bildirimlərini idarə et</p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-indigo-600 font-medium">Bax →</span>
        </div>
      </button>

      {/* Disabled / post-demo — klikləncək deyil */}
      <div aria-disabled="true"
        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm opacity-70 cursor-not-allowed select-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg text-gray-500">🔐</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-700">Rol və icazələr</p>
              <p className="text-xs text-gray-400 mt-0.5">Rol təyini və icazə tənzimləmələri</p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Tezliklə</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const TABS: { value: Tab; label: string }[] = [
  { value: 'users', label: 'İstifadəçilər' },
  { value: 'courses', label: 'Kurslar' },
  { value: 'groups', label: 'Qruplar' },
  { value: 'feedback', label: 'Təklif və İradlar' },
  { value: 'centers', label: 'Mərkəz müraciətləri' },
  { value: 'management', label: 'İdarəetmə hazırlığı' },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [userRole, setUserRole] = useState('')
  const [courseStatus, setCourseStatus] = useState('')
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const { data: overview, isLoading, isError, refetch } = useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<{ data: AdminOverview }>('/admin/overview').then((r) => r.data.data),
  })

  const openUsers = (role: string) => { setUserRole(role); setTab('users') }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Admin panel</h1>
          <p className="mt-1 text-sm text-gray-600">
            Platforma istifadəçiləri, rollar və demo hazırlığını real məlumatlarla izləyin.
          </p>
        </div>

        {/* Overview stat cards — kliklənəndə uyğun tab/filtrə keçir */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
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
        ) : overview ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard label="Ümumi istifadəçi" value={overview.totalUsers} accent="text-gray-900" active={tab === 'users' && userRole === ''} onClick={() => openUsers('')} />
              <StatCard label="Şagirdlər" value={overview.usersByRole.student ?? 0} accent="text-indigo-600" active={tab === 'users' && userRole === 'student'} onClick={() => openUsers('student')} />
              <StatCard label="Müəllimlər" value={overview.usersByRole.teacher ?? 0} accent="text-emerald-600" active={tab === 'users' && userRole === 'teacher'} onClick={() => openUsers('teacher')} />
              <StatCard label="Valideynlər" value={overview.usersByRole.parent ?? 0} accent="text-amber-600" active={tab === 'users' && userRole === 'parent'} onClick={() => openUsers('parent')} />
              <StatCard label="Kurslar" value={overview.courses.total} accent="text-blue-600" active={tab === 'courses'} onClick={() => setTab('courses')} />
              <StatCard label="Qruplar" value={overview.groups.total} accent="text-violet-600" active={tab === 'groups'} onClick={() => setTab('groups')} />
            </div>
            <p className="text-xs text-gray-400">
              Sistem hesabları: {(overview.usersByRole.admin ?? 0).toLocaleString('az-AZ')} admin · {(overview.usersByRole.manager ?? 0).toLocaleString('az-AZ')} menecer
            </p>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${tab === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'users' && <UsersTab role={userRole} setRole={setUserRole} onOpen={(u) => setDrawer({ type: 'user', user: u })} />}
        {tab === 'courses' && <CoursesTab status={courseStatus} setStatus={setCourseStatus} onOpen={(c) => setDrawer({ type: 'course', course: c })} />}
        {tab === 'groups' && <GroupsTab onOpen={(g) => setDrawer({ type: 'group', group: g })} />}
        {tab === 'feedback' && <FeedbackTab />}
        {tab === 'centers' && <CenterApplicationsTab />}
        {tab === 'management' && <ManagementTab onUsers={() => openUsers('')} onCourses={() => setTab('courses')} onFeedback={() => setTab('feedback')} />}
      </div>

      <DetailDrawer state={drawer} onClose={() => setDrawer(null)} />
    </div>
  )
}
