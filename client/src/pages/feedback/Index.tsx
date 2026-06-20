import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES } from '../../constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyFeedback {
  _id: string
  category: string
  type: string
  title: string
  message: string
  priority: string
  status: string
  adminNote: string
  createdAt?: string
}

// ── Seçim siyahıları (backend enum-ları ilə eyni dəyərlər) ──────────────────

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'suggestion', label: 'Təklif' },
  { value: 'complaint', label: 'Şikayət' },
  { value: 'bug', label: 'Səhv (bug)' },
  { value: 'improvement', label: 'Təkmilləşdirmə' },
]

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ui', label: 'İnterfeys' },
  { value: 'lesson', label: 'Dərs' },
  { value: 'teacher', label: 'Müəllim' },
  { value: 'payment', label: 'Ödəniş' },
  { value: 'technical', label: 'Texniki' },
  { value: 'accessibility', label: 'Əlçatımlılıq' },
  { value: 'suggestion', label: 'Təklif' },
  { value: 'other', label: 'Digər' },
]

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: 'Aşağı' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksək' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'Yeni', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  reviewing: { label: 'Baxılır', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Həll olundu', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rədd edildi', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]))
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]))

const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5'
const fieldCls =
  'w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400 transition-colors'

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = err && typeof err === 'object' && 'response' in err ? (err as { response?: unknown }).response : null
  if (!response || typeof response !== 'object') return fallback
  const data = 'data' in response ? (response as { data?: unknown }).data : null
  if (!data || typeof data !== 'object') return fallback
  // Backend validasiya xətaları errors[] kimi gəlir; yoxsa message.
  if ('errors' in data && Array.isArray((data as { errors?: unknown[] }).errors) && (data as { errors: unknown[] }).errors.length) {
    const first = (data as { errors: unknown[] }).errors[0]
    if (typeof first === 'string' && first.trim()) return first
  }
  if ('message' in data && typeof (data as { message?: unknown }).message === 'string' && (data as { message: string }).message.trim()) {
    return (data as { message: string }).message
  }
  return fallback
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { type: 'suggestion', category: 'ui', priority: 'medium', title: '', message: '' }

export default function Feedback() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const { data: myList, isLoading, isError, refetch } = useQuery<MyFeedback[]>({
    queryKey: ['feedback', 'my'],
    queryFn: () => api.get<{ data: MyFeedback[] }>(API_ROUTES.FEEDBACK.MY).then((r) => r.data.data ?? []),
  })

  const mutation = useMutation({
    mutationFn: (payload: typeof EMPTY_FORM) =>
      api.post<{ data: MyFeedback }>(API_ROUTES.FEEDBACK.CREATE, {
        type: payload.type,
        category: payload.category,
        priority: payload.priority,
        title: payload.title.trim(),
        message: payload.message.trim(),
      }).then((r) => r.data.data),
    // Uğur YALNIZ backend təsdiqindən sonra: formu təmizlə + siyahını yenilə.
    onSuccess: () => {
      setError('')
      setForm(EMPTY_FORM)
      queryClient.invalidateQueries({ queryKey: ['feedback', 'my'] })
      toast.success('Təşəkkürlər! Göndərildi.')
    },
    // Xəta: dəyərlər saxlanır, fake uğur yox.
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Göndərilmədi. Yenidən cəhd edin.')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    const message = form.message.trim()
    if (title.length < 3) { setError('Başlıq ən azı 3 simvol olmalıdır.'); return }
    if (message.length < 5) { setError('Mesaj ən azı 5 simvol olmalıdır.'); return }
    setError('')
    mutation.mutate(form)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Təklif və İradlar</h1>
          <p className="mt-1 text-sm text-gray-600">
            Platformanı yaxşılaşdırmaq üçün fikrini, problemini və ya təklifini göndər.
          </p>
        </div>

        {/* Submit form */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls} htmlFor="fb-type">Növ</label>
                <select id="fb-type" value={form.type} onChange={(e) => setField('type', e.target.value)} className={fieldCls}>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="fb-category">Kateqoriya</label>
                <select id="fb-category" value={form.category} onChange={(e) => setField('category', e.target.value)} className={fieldCls}>
                  {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="fb-priority">Prioritet</label>
                <select id="fb-priority" value={form.priority} onChange={(e) => setField('priority', e.target.value)} className={fieldCls}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="fb-title">Başlıq</label>
              <input id="fb-title" value={form.title} onChange={(e) => setField('title', e.target.value)}
                placeholder="Qısa başlıq" maxLength={120} className={fieldCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="fb-message">Mesaj</label>
              <textarea id="fb-message" value={form.message} onChange={(e) => setField('message', e.target.value)}
                rows={4} maxLength={2000} placeholder="Fikrini ətraflı yaz..." className={`${fieldCls} resize-none`} />
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <button type="submit" disabled={mutation.isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              {mutation.isPending ? 'Göndərilir...' : 'Göndər'}
            </button>
          </form>
        </section>

        {/* My feedback list */}
        <section className="space-y-3">
          <h2 className="font-bold text-gray-900">Mənim göndərdiklərim</h2>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : isError ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
              <p className="text-sm text-gray-600">Siyahı yüklənmədi.</p>
              <button onClick={() => refetch()} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Yenidən yoxla</button>
            </div>
          ) : myList && myList.length > 0 ? (
            <ul className="space-y-3">
              {myList.map((f) => {
                const badge = STATUS_BADGE[f.status] ?? { label: f.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' }
                return (
                  <li key={f._id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 min-w-0 break-words">{f.title}</p>
                      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {(TYPE_LABELS[f.type] ?? f.type)} · {(CATEGORY_LABELS[f.category] ?? f.category)}{fmtDate(f.createdAt) ? ` · ${fmtDate(f.createdAt)}` : ''}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{f.message}</p>
                    {f.adminNote && (
                      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                        <p className="text-[11px] font-semibold text-indigo-700">Admin qeydi</p>
                        <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{f.adminNote}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm text-gray-400">Hələ təklif və ya irad göndərməmisən.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
