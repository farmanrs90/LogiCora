import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'

// ── Sabitlər (backend enum-ları ilə eyni dəyərlər) ──────────────────────────

const CATEGORIES = [
  'Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'Coğrafiya',
  'İngilis dili', 'Proqramlaşdırma', 'Şahmat', 'Musiqi', 'İncəsənət', 'Digər',
]
const LEVELS: { value: string; label: string }[] = [
  { value: 'beginner', label: 'Başlanğıc' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İrəliləmiş' },
]
const LANGUAGES: { value: string; label: string }[] = [
  { value: 'az', label: 'Azərbaycan' },
  { value: 'ru', label: 'Rus' },
  { value: 'en', label: 'İngilis' },
]
const AGE_GROUPS = ['3-5', '6-8', '9-11', '12-14', '15-17', '18-22', '23+']

interface RawCourse {
  _id?: string
  title?: string
  description?: string
  category?: string
  level?: string
  language?: string
  price?: number
  thumbnail?: string | null
  ageGroup?: string[]
  isPublished?: boolean
  teacherId?: { userId?: string } | string | null
}
interface CourseByIdResponse { course: RawCourse; lessons: unknown[] }

interface CourseForm {
  title: string
  description: string
  category: string
  level: string
  language: string
  price: string
  thumbnail: string
  ageGroup: string[]
}
const EMPTY_FORM: CourseForm = {
  title: '', description: '', category: 'Riyaziyyat', level: 'beginner',
  language: 'az', price: '0', thumbnail: '', ageGroup: [],
}

const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5'
const fieldCls =
  'w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400 transition-colors'

// Backend mesajı (api interceptor {message,status} formasına salır). Generic "Validation error"-u gizlədirik.
function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string' && m.trim() && m !== 'Validation error') return m
  }
  return fallback
}

function ownerUserIdOf(course: RawCourse | undefined): string {
  const t = course?.teacherId
  if (t && typeof t === 'object' && t.userId) return String(t.userId)
  return ''
}

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [publishMsg, setPublishMsg] = useState('')

  // Edit: mövcud kursu gətir (owner-aware GET — qaralama yalnız sahibə açılır).
  const { data: existing, isLoading, isError } = useQuery<CourseByIdResponse>({
    queryKey: ['course', id],
    queryFn: () => api.get<{ data: CourseByIdResponse }>(API_ROUTES.COURSES.BY_ID(id!)).then(r => r.data.data),
    enabled: isEdit,
    retry: false,
  })

  const existingCourse = existing?.course
  const isPublished = Boolean(existingCourse?.isPublished)
  const ownerUserId = ownerUserIdOf(existingCourse)
  const isOwner = !isEdit || (!!user && !!ownerUserId && String(user._id) === ownerUserId)

  // Prefill (yalnız sahib üçün; fake state yox).
  useEffect(() => {
    if (!existingCourse) return
    setForm({
      title: existingCourse.title ?? '',
      description: existingCourse.description ?? '',
      category: existingCourse.category ?? 'Riyaziyyat',
      level: existingCourse.level ?? 'beginner',
      language: existingCourse.language ?? 'az',
      price: String(existingCourse.price ?? 0),
      thumbnail: existingCourse.thumbnail ?? '',
      ageGroup: Array.isArray(existingCourse.ageGroup) ? existingCourse.ageGroup : [],
    })
  }, [existingCourse])

  const setField = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }
  const toggleAge = (g: string) => {
    setForm(prev => ({ ...prev, ageGroup: prev.ageGroup.includes(g) ? prev.ageGroup.filter(x => x !== g) : [...prev.ageGroup, g] }))
    if (error) setError('')
  }

  const priceNum = Number(form.price)
  const isPaid = Number.isFinite(priceNum) && priceNum > 0

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      (isEdit
        ? api.put<{ data: RawCourse }>(API_ROUTES.COURSES.UPDATE(id!), payload)
        : api.post<{ data: RawCourse }>(API_ROUTES.COURSES.CREATE, payload)
      ).then(r => r.data),
    onSuccess: (resp) => {
      setError('')
      qc.invalidateQueries({ queryKey: ['courses'] })
      const savedId = resp?.data?._id ?? id
      toast.success(isEdit ? 'Kurs yeniləndi' : 'Kurs yaradıldı')
      if (savedId) {
        qc.invalidateQueries({ queryKey: ['course', savedId] })
        // Yeni kurs qaralama olur → redaktə səhifəsində qalırıq (owner-aware GET ilə açılır).
        navigate(`/courses/${savedId}/edit`, { replace: true })
      } else {
        navigate(APP_ROUTES.DASHBOARD.TEACHER)
      }
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Saxlanmadı. Yenidən cəhd edin.')),
  })

  const publishMutation = useMutation({
    mutationFn: () => api.patch(API_ROUTES.COURSES.PUBLISH(id!)).then(r => r.data),
    onSuccess: () => {
      setPublishMsg('')
      qc.invalidateQueries({ queryKey: ['course', id] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      toast.success('Kurs yayımlandı')
    },
    // Real backend qaydası: ən azı 1 dərs tələb olunur → dürüst mesaj göstərilir (fake yox).
    onError: (err: unknown) => setPublishMsg(getApiErrorMessage(err, 'Yayımlanmadı. Yenidən cəhd edin.')),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    const description = form.description.trim()
    if (title.length < 3) { setError('Başlıq ən azı 3 simvol olmalıdır.'); return }
    if (description.length < 10) { setError('Təsvir ən azı 10 simvol olmalıdır.'); return }
    if (!form.category) { setError('Kateqoriya seçin.'); return }
    if (form.ageGroup.length === 0) { setError('Ən azı bir yaş qrupu seçin.'); return }
    if (!Number.isFinite(priceNum) || priceNum < 0) { setError('Qiymət 0 və ya müsbət olmalıdır.'); return }
    const thumb = form.thumbnail.trim()
    if (thumb && !/^https?:\/\//i.test(thumb)) { setError('Şəkil URL-i http(s):// ilə başlamalıdır.'); return }

    setError('')
    const payload: Record<string, unknown> = {
      title, description,
      category: form.category,
      level: form.level,
      language: form.language,
      price: priceNum,
      ageGroup: form.ageGroup,
    }
    if (thumb) payload.thumbnail = thumb
    saveMutation.mutate(payload)
  }

  // ── Edit yükləmə/xəta/sahiblik halları ───────────────────────────────────
  if (isEdit && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-1/2 animate-pulse" />
          <div className="h-64 bg-white border border-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }
  if (isEdit && (isError || !existingCourse)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-3">📕</div>
          <h1 className="text-xl font-bold text-gray-900">Kurs tapılmadı və ya icazəniz yoxdur</h1>
          <p className="text-sm text-gray-500 mt-2">Yalnız öz kurslarınızı redaktə edə bilərsiniz.</p>
          <Link to={APP_ROUTES.DASHBOARD.TEACHER} className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
            Panelə qayıt
          </Link>
        </div>
      </div>
    )
  }
  if (isEdit && !isOwner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Bu kurs sizə aid deyil</h1>
          <p className="text-sm text-gray-500 mt-2">Yalnız kursun sahibi onu redaktə edə bilər.</p>
          <Link to={`/courses/${id}`} className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
            Kursa bax
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              {isEdit ? 'Kursu redaktə et' : 'Yeni kurs yarat'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">Kurs məlumatlarını doldur. Qiymət 0 olarsa kurs pulsuz olur.</p>
          </div>
          <Link to={APP_ROUTES.DASHBOARD.TEACHER} className="shrink-0 text-sm text-gray-500 hover:text-gray-900 rounded-lg px-2 py-1 transition-colors">← Panel</Link>
        </div>

        {/* Free/paid + publish status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${isPaid ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {isPaid ? `Pullu kurs · ${priceNum} ₼` : 'Pulsuz kurs'}
          </span>
          {isEdit && (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${isPublished ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-gray-500 border-gray-200'}`}>
              {isPublished ? 'Yayımda' : 'Qaralama'}
            </span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className={labelCls} htmlFor="c-title">Başlıq *</label>
            <input id="c-title" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Kursun adı" maxLength={150} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-desc">Təsvir *</label>
            <textarea id="c-desc" value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Kurs nə haqqındadır?" className={`${fieldCls} resize-none`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor="c-cat">Kateqoriya *</label>
              <select id="c-cat" value={form.category} onChange={e => setField('category', e.target.value)} className={fieldCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="c-level">Səviyyə *</label>
              <select id="c-level" value={form.level} onChange={e => setField('level', e.target.value)} className={fieldCls}>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="c-lang">Dil *</label>
              <select id="c-lang" value={form.language} onChange={e => setField('language', e.target.value)} className={fieldCls}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="c-price">Qiymət (₼) — 0 = pulsuz</label>
              <input id="c-price" type="number" min={0} step="1" value={form.price} onChange={e => setField('price', e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-thumb">Şəkil URL-i (istəyə bağlı)</label>
              <input id="c-thumb" value={form.thumbnail} onChange={e => setField('thumbnail', e.target.value)} placeholder="https://..." inputMode="url" className={fieldCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Yaş qrupları *</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(g => (
                <button key={g} type="button" onClick={() => toggleAge(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${form.ageGroup.includes(g) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saveMutation.isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              {saveMutation.isPending ? 'Saxlanılır...' : isEdit ? 'Dəyişiklikləri saxla' : 'Kursu yarat'}
            </button>
          </div>
        </form>

        {/* Publish + delete (yalnız edit + sahib) */}
        {isEdit && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Yayım</h2>
            {isPublished ? (
              <p className="text-sm text-emerald-700">Bu kurs yayımdadır və tələbələrə görünür.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500">Yayım üçün kursda ən azı 1 dərs olmalıdır. Dərs idarəetməsi post-demo mərhələsində əlavə ediləcək.</p>
                <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {publishMutation.isPending ? 'Yayımlanır...' : 'Yayımla'}
                </button>
                {publishMsg && <p className="text-xs text-rose-600">{publishMsg}</p>}
              </>
            )}

            <div className="pt-3 border-t border-gray-100">
              <button type="button" disabled aria-disabled="true"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed">
                Kursu sil (post-demo)
              </button>
              <p className="text-[11px] text-gray-400 mt-1">Silinmə tələbə qeydiyyatlarını da silir — təhlükəsizlik üçün demo-da deaktivdir.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
