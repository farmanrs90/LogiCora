import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'

// ── Types (backend /centers/my-application şəkli) ───────────────────────────

interface CenterApplication {
  _id: string
  centerName: string
  taxIdOrVoen: string
  contactName: string
  phone: string
  address: string
  city: string
  description: string
  documentUrl: string
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string
  createdAt?: string
  reviewedAt?: string | null
}
interface MyApplicationResponse {
  status: 'none' | 'pending' | 'approved' | 'rejected'
  application: CenterApplication | null
  center: { _id: string; name: string; city: string; joinCode: string; isActive: boolean; verificationLevel?: string } | null
}

const CENTER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'individual_teacher', label: 'Fərdi müəllim' },
  { value: 'course_center', label: 'Hazırlıq / kurs mərkəzi' },
  { value: 'school_or_org', label: 'Məktəb / təşkilat' },
]

const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5'
const fieldCls =
  'w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400 transition-colors'

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string' && m.trim() && m !== 'Validation error') return m
  }
  return fallback
}

const EMPTY = {
  centerName: '', centerType: 'individual_teacher', taxIdOrVoen: '', contactName: '', phone: '', address: '', city: '', description: '', documentUrl: '',
}

export default function CenterApply() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<MyApplicationResponse>({
    queryKey: ['centers', 'my-application'],
    queryFn: () => api.get<{ data: MyApplicationResponse }>(API_ROUTES.CENTERS.MY_APPLICATION).then(r => r.data.data),
  })

  const setField = (k: keyof typeof EMPTY, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (error) setError('')
  }

  const mutation = useMutation({
    mutationFn: (payload: Record<string, string>) => api.post(API_ROUTES.CENTERS.APPLY, payload).then(r => r.data),
    onSuccess: () => {
      setError('')
      setForm(EMPTY)
      qc.invalidateQueries({ queryKey: ['centers', 'my-application'] })
      toast.success('Müraciətiniz göndərildi.')
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Müraciət göndərilmədi. Yenidən cəhd edin.')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const centerName = form.centerName.trim()
    const phone = form.phone.trim()
    const address = form.address.trim()
    if (centerName.length < 2) { setError('Mərkəz adı ən azı 2 simvol olmalıdır.'); return }
    if (phone.length < 7) { setError('Telefon nömrəsi düzgün deyil.'); return }
    if (address.length < 3) { setError('Ünvan tələb olunur.'); return }
    const docUrl = form.documentUrl.trim()
    if (docUrl && !/^https?:\/\//i.test(docUrl)) { setError('Sənəd linki http(s):// ilə başlamalıdır.'); return }
    setError('')
    const payload: Record<string, string> = { centerName, phone, address, centerType: form.centerType }
    if (form.taxIdOrVoen.trim()) payload.taxIdOrVoen = form.taxIdOrVoen.trim()
    if (form.contactName.trim()) payload.contactName = form.contactName.trim()
    if (form.city.trim()) payload.city = form.city.trim()
    if (form.description.trim()) payload.description = form.description.trim()
    if (docUrl) payload.documentUrl = docUrl
    mutation.mutate(payload)
  }

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* clipboard icazəsi yoxdursa səssiz keç */ })
  }

  const status = data?.status

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Təhsil mərkəzi müraciəti</h1>
          <p className="mt-1 text-sm text-gray-600">
            Mərkəzinizi platformaya əlavə etmək üçün məlumatları göndərin. Admin təsdiqindən sonra müəllimləri dəvət edə biləcəksiniz.
          </p>
        </div>

        {isLoading ? (
          <div className="h-64 bg-white border border-gray-200 rounded-2xl animate-pulse" />
        ) : isError ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
            <p className="text-sm text-gray-600">Məlumat yüklənmədi.</p>
            <button onClick={() => refetch()} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Yenidən yoxla</button>
          </div>
        ) : status === 'approved' && data?.center ? (
          /* ── Təsdiqlənmiş: mərkəz + joinCode ── */
          <section className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="font-bold text-gray-900">Mərkəziniz təsdiqləndi</h2>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{data.center.name}</span>{data.center.city ? ` · ${data.center.city}` : ''}
              {data.center.verificationLevel === 'verified' ? (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">✓ Təsdiqlənmiş</span>
              ) : (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-gray-600 border-gray-200">Əsas səviyyə</span>
              )}
            </p>
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Qoşulma kodu</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-gray-900 tracking-wider">{data.center.joinCode}</span>
                <button onClick={() => copyCode(data.center!.joinCode)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-lg px-2 py-1 transition-colors">
                  {copied ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Bu kodu müəllimlərə göndərin. Müəllim qeydiyyatda kodu daxil etdikdə mərkəzə bağlanacaq.
            </p>
          </section>
        ) : status === 'pending' ? (
          /* ── Gözləyir ── */
          <section className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏳</span>
              <h2 className="font-bold text-gray-900">Müraciətiniz yoxlanılır.</h2>
            </div>
            {data?.application && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">{data.application.centerName}</span> üçün müraciətiniz admin yoxlamasındadır. Təsdiqdən sonra qoşulma kodu burada görünəcək.
              </p>
            )}
          </section>
        ) : (
          /* ── Forma (none / rejected) ── */
          <>
            {status === 'rejected' && data?.application && (
              <section className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h2 className="font-bold text-gray-900">Əvvəlki müraciətiniz rədd edildi</h2>
                </div>
                {data.application.adminNote && <p className="text-sm text-gray-600">Admin qeydi: {data.application.adminNote}</p>}
                <p className="text-xs text-gray-500">Aşağıdakı formanı yenidən doldurub təkrar müraciət edə bilərsiniz.</p>
              </section>
            )}

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="c-name">Mərkəz adı *</label>
                  <input id="c-name" value={form.centerName} onChange={e => setField('centerName', e.target.value)} placeholder="Məsələn: Bakı Təhsil Mərkəzi" maxLength={120} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="c-type">Müraciət növü</label>
                  <select id="c-type" value={form.centerType} onChange={e => setField('centerType', e.target.value)} className={fieldCls}>
                    {CENTER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="c-voen">VÖEN / sənəd nömrəsi</label>
                <input id="c-voen" value={form.taxIdOrVoen} onChange={e => setField('taxIdOrVoen', e.target.value)} maxLength={40} className={fieldCls} />
                <p className="mt-1 text-[11px] text-gray-400">
                  VÖEN və ya sənəd rəsmi təsdiq üçün tövsiyə olunur. Fərdi müəllim və ya kiçik hazırlıq qrupu kimi müraciət edirsinizsə, bu sahəni boş saxlaya bilərsiniz.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="c-contact">Əlaqə şəxsi</label>
                <input id="c-contact" value={form.contactName} onChange={e => setField('contactName', e.target.value)} maxLength={120} className={fieldCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="c-phone">Telefon *</label>
                  <input id="c-phone" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+994 50 000 00 00" inputMode="tel" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="c-city">Şəhər</label>
                  <input id="c-city" value={form.city} onChange={e => setField('city', e.target.value)} maxLength={60} className={fieldCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="c-address">Ünvan *</label>
                <input id="c-address" value={form.address} onChange={e => setField('address', e.target.value)} maxLength={300} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c-doc">Sənəd linki (istəyə bağlı)</label>
                <input id="c-doc" value={form.documentUrl} onChange={e => setField('documentUrl', e.target.value)} placeholder="https://..." inputMode="url" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="c-desc">Təsvir</label>
                <textarea id="c-desc" value={form.description} onChange={e => setField('description', e.target.value)} rows={3} maxLength={1000} className={`${fieldCls} resize-none`} />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <button type="submit" disabled={mutation.isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                {mutation.isPending ? 'Göndərilir...' : 'Müraciəti göndər'}
              </button>
            </form>
          </>
        )}

        <Link to={APP_ROUTES.SETTINGS} className="inline-block text-sm text-gray-500 hover:text-gray-900 transition-colors">← Tənzimləmələr</Link>
      </div>
    </div>
  )
}
