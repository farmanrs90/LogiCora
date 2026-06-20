import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'

interface AccessibilityConfig {
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  highContrast: boolean
  audioQuestions: boolean
  simplifiedUI: boolean
  noAnimations: boolean
  largeClickTargets: boolean
  keyboardOnly: boolean
}

const DEFAULT_CONFIG: AccessibilityConfig = {
  fontSize: 'md',
  highContrast: false,
  audioQuestions: false,
  simplifiedUI: false,
  noAnimations: false,
  largeClickTargets: false,
  keyboardOnly: false,
}

const FONT_SIZES = [
  { value: 'sm' as const, label: 'Kiçik', px: 14 },
  { value: 'md' as const, label: 'Normal', px: 16 },
  { value: 'lg' as const, label: 'Böyük', px: 18 },
  { value: 'xl' as const, label: 'Çox böyük', px: 22 },
]

const TOGGLES: { key: keyof AccessibilityConfig; label: string; desc: string; emoji: string }[] = [
  { key: 'highContrast', label: 'Yüksək kontrast', desc: 'Rəngləri daha sezilən et', emoji: '🌗' },
  { key: 'audioQuestions', label: 'Sual səsi', desc: 'Günlük Quizdə “Sualı səsləndir” düyməsi görünür', emoji: '🔊' },
  { key: 'simplifiedUI', label: 'Sadə interfeys', desc: 'Bəzəkləri azalt', emoji: '✨' },
  { key: 'noAnimations', label: 'Animasiyasız', desc: 'Bütün animasiyaları söndür', emoji: '🚫' },
  { key: 'largeClickTargets', label: 'Böyük düymələr', desc: 'Daha böyük klik sahəsi', emoji: '👆' },
  { key: 'keyboardOnly', label: 'Yalnız klaviatura', desc: 'Klaviatura naviqasiyası', emoji: '⌨️' },
]

const ROLE_LABELS: Record<Role, string> = {
  student: 'Tələbə',
  teacher: 'Müəllim',
  parent: 'Valideyn',
  admin: 'Admin',
  manager: 'Menecer',
}

const SPECIAL_NEEDS_TYPES = ['Görmə', 'Eşitmə', 'İdrak', 'Motor', 'Digər']

const inputCls =
  'w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ' +
  'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed placeholder:text-gray-400 transition-colors'

const primaryBtn =
  'px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

// Backend xəta mesajını dürüst göstər — fake mesaj uydurmadan.
function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = err && typeof err === 'object' && 'response' in err ? err.response : null
  if (!response || typeof response !== 'object' || !('data' in response)) return fallback
  const data = response.data
  if (!data || typeof data !== 'object' || !('message' in data)) return fallback
  return typeof data.message === 'string' && data.message.trim() ? data.message : fallback
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
      aria-pressed={value}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  )
}

// ── Account / Profile ─────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ name: '', surname: '', phone: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Auth user gələndə (və ya yenilənəndə) formu sinxronla.
  useEffect(() => {
    if (user) setForm({ name: user.name ?? '', surname: user.surname ?? '', phone: user.phone ?? '' })
  }, [user])

  const setField = (key: 'name' | 'surname' | 'phone', value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
    if (saved) setSaved(false)
  }

  const mutation = useMutation({
    // Yalnız backend-in dəstəklədiyi sahələr göndərilir: name, surname, phone (email/yaş YOX).
    mutationFn: (payload: { name: string; surname: string; phone?: string }) =>
      api.put(API_ROUTES.USER.UPDATE, payload).then(r => r.data),
    onSuccess: async () => {
      setError('')
      setSaved(true)
      await refreshUser()
      toast.success('Profil yeniləndi')
      setTimeout(() => setSaved(false), 2500)
    },
    // Xəta: dəyərlər saxlanır, fake uğur yox.
    onError: (err: unknown) => {
      setSaved(false)
      setError(getApiErrorMessage(err, 'Profil yenilənmədi. Yenidən cəhd edin.'))
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Kənar boşluqlar kəsilir + təkrar boşluqlar tək boşluğa yığılır (Azərbaycan hərfləri qorunur).
    const name = form.name.trim().replace(/\s+/g, ' ')
    const surname = form.surname.trim().replace(/\s+/g, ' ')
    const phone = form.phone.trim().replace(/\s+/g, ' ')
    if (name.length < 2) { setError('Ad ən azı 2 hərf olmalıdır.'); return }
    // phone backend-də min 7 max 20 — boşdursa göndərmirik (mövcud dəyər qalır).
    const payload: { name: string; surname: string; phone?: string } = { name, surname }
    if (phone) {
      if (phone.length < 7 || phone.length > 20) { setError('Telefon nömrəsi 7–20 simvol olmalıdır.'); return }
      payload.phone = phone
    }
    setError('')
    mutation.mutate(payload)
  }

  return (
    <section id="account" tabIndex={-1} className="scroll-mt-24 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 focus:outline-none">
      <div>
        <h2 className="font-bold text-gray-900">Hesab məlumatları</h2>
        <p className="mt-0.5 text-xs text-gray-500">Ad, soyad, telefon və təhlükəsizlik məlumatlarını idarə et.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Ad</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Adınız" className={inputCls} autoComplete="given-name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Soyad</label>
            <input value={form.surname} onChange={e => setField('surname', e.target.value)} placeholder="Soyadınız" className={inputCls} autoComplete="family-name" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Telefon</label>
          <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+994 50 000 00 00" inputMode="tel" className={inputCls} autoComplete="tel" />
        </div>

        {/* Read-only sahələr — backend dəyişməni dəstəkləmir */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input disabled value={user?.email ?? ''} className={inputCls} />
            <p className="text-[11px] text-gray-400 mt-1">Email hələlik dəyişdirilə bilməz.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol</label>
            <input disabled value={user ? ROLE_LABELS[user.role] : ''} className={inputCls} />
          </div>
        </div>

        {user?.ageGroup && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Yaş qrupu</label>
            <input disabled value={user.ageGroup} className={inputCls} />
            <p className="text-[11px] text-gray-400 mt-1">Yaş qrupu hələlik dəyişdirilə bilməz.</p>
          </div>
        )}

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
            {mutation.isPending ? 'Saxlanılır...' : 'Yadda saxla'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saxlandı</span>}
        </div>
      </form>
    </section>
  )
}

// ── Password change ───────────────────────────────────────────────────────

function PasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')

  const setField = (key: 'current' | 'next' | 'confirm', value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const mutation = useMutation({
    // Backend yalnız currentPassword + newPassword gözləyir (confirmPassword göndərilmir).
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post(API_ROUTES.USER.CHANGE_PASSWORD, payload).then(r => r.data),
    // Uğur YALNIZ backend təsdiqindən sonra: sahələri təmizlə.
    onSuccess: () => {
      setError('')
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Şifrə dəyişdirildi')
    },
    // Xəta: sahələr saxlanır (təkrar cəhd üçün), dürüst xəta göstərilir.
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Şifrə dəyişdirilmədi. Cari şifrəni yoxlayın.'))
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.current) { setError('Cari şifrəni daxil edin.'); return }
    if (form.next.length < 6) { setError('Yeni şifrə ən azı 6 simvol olmalıdır.'); return }
    if (form.next !== form.confirm) { setError('Yeni şifrə təsdiqi uyğun gəlmir.'); return }
    setError('')
    mutation.mutate({ currentPassword: form.current, newPassword: form.next })
  }

  return (
    <section id="security" tabIndex={-1} className="scroll-mt-24 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 focus:outline-none">
      <div>
        <h2 className="font-bold text-gray-900">Şifrəni dəyiş</h2>
        <p className="mt-0.5 text-xs text-gray-500">Təhlükəsizlik üçün güclü, unikal şifrə seçin.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Cari şifrə</label>
          <input type="password" value={form.current} onChange={e => setField('current', e.target.value)} className={inputCls} autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Yeni şifrə</label>
            <input type="password" value={form.next} onChange={e => setField('next', e.target.value)} placeholder="Ən azı 6 simvol" className={inputCls} autoComplete="new-password" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Yeni şifrə (təkrar)</label>
            <input type="password" value={form.confirm} onChange={e => setField('confirm', e.target.value)} className={inputCls} autoComplete="new-password" />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button type="submit" disabled={mutation.isPending} className={primaryBtn}>
          {mutation.isPending ? 'Dəyişdirilir...' : 'Şifrəni yenilə'}
        </button>
      </form>
    </section>
  )
}

// ── Parent → child special support (real /accessibility/child/:id flow) ────

interface ParentChildLite {
  id: string
  name: string
  ageGroup?: string
}

function ParentChildSupport() {
  const qc = useQueryClient()
  const { data: children, isLoading, isError } = useQuery<ParentChildLite[]>({
    queryKey: ['children'],
    queryFn: () => api.get<ParentChildLite[]>('/parent/children').then(r => r.data),
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState<'yes' | 'no' | 'prefer_not' | null>(null)
  const [types, setTypes] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (children && children.length > 0 && !selectedId) setSelectedId(children[0].id)
  }, [children, selectedId])

  // Seçilmiş uşağın real saxlanmış xüsusi dəstək seçimi — yenidən açanda prefill.
  const { data: childCfg } = useQuery<{ hasSpecialNeeds?: boolean; specialNeedsTypes?: string[] }>({
    queryKey: ['child-accessibility', selectedId],
    queryFn: () =>
      api.get<{ data: { hasSpecialNeeds?: boolean; specialNeedsTypes?: string[] } }>(`/accessibility/child/${selectedId}`).then(r => r.data.data),
    enabled: !!selectedId,
  })

  // Uşaq dəyişəndə və ya config gələndə real backend dəyərindən prefill (fake state yox).
  useEffect(() => {
    setError('')
    setSaved(false)
    if (childCfg?.hasSpecialNeeds) {
      setAnswer('yes')
      setTypes(Array.isArray(childCfg.specialNeedsTypes) ? childCfg.specialNeedsTypes : [])
    } else {
      setAnswer(null)
      setTypes([])
    }
  }, [selectedId, childCfg])

  const save = async () => {
    if (!selectedId || !answer || answer === 'prefer_not') return
    setError('')
    setPending(true)
    try {
      await api.put(`/accessibility/child/${selectedId}`, {
        hasSpecialNeeds: answer === 'yes',
        types: answer === 'yes' ? types : [],
      })
      qc.invalidateQueries({ queryKey: ['child-accessibility', selectedId] })
      setSaved(true)
      toast.success('Saxlanıldı')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Ayarlar saxlanmadı. Yenidən cəhd edin.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">👨‍👧</div>
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900">Övladın üçün xüsusi dəstək ayarları</h2>
          <p className="mt-1 text-xs text-gray-500">Bu seçim tibbi diaqnoz deyil və istənilən vaxt dəyişdirilə bilər.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 bg-slate-50 border border-gray-200 rounded-xl animate-pulse" />
      ) : isError ? (
        <p className="text-sm text-gray-500">Övlad siyahısı yüklənmədi. Tam idarəetmə üçün Valideyn panelinə keçin.</p>
      ) : children && children.length > 0 ? (
        <>
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map(child => (
                <button key={child.id} onClick={() => setSelectedId(child.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selectedId === child.id
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{child.name[0]}</span>
                  <span className="text-sm font-medium">{child.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {([['yes', 'Bəli'], ['no', 'Xeyr'], ['prefer_not', 'Cavablamaq istəmirəm']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setAnswer(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${answer === val ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {answer === 'yes' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Növ seçin (birdən çox ola bilər):</p>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_NEEDS_TYPES.map(t => (
                  <button key={t} onClick={() => setTypes(arr => arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t])}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${types.includes(t) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {answer && answer !== 'prefer_not' && (
              <button onClick={save} disabled={pending}
                className={saved ? primaryBtn.replace('bg-indigo-600 hover:bg-indigo-700', 'bg-emerald-600') : primaryBtn}
              >
                {pending ? 'Saxlanılır...' : saved ? '✓ Saxlandı' : 'Yadda saxla'}
              </button>
            )}
            <Link to={APP_ROUTES.DASHBOARD.PARENT}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              Valideyn panelində tam idarə et →
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Hələ övlad əlavə edilməyib.</p>
          <Link to={APP_ROUTES.DASHBOARD.PARENT}
            className="inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          >
            Övlad üçün adaptiv ayarları Valideyn panelindən idarə et →
          </Link>
        </div>
      )}
    </section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [local, setLocal] = useState<AccessibilityConfig>(DEFAULT_CONFIG)

  const { data, isLoading } = useQuery<AccessibilityConfig>({
    queryKey: ['accessibility', 'me'],
    queryFn: () => api.get<{ data: AccessibilityConfig }>(API_ROUTES.ACCESSIBILITY.ME).then(r => r.data.data),
  })

  // Backend-dən gələn config-i local state-ə sinxronla
  useEffect(() => { if (data) setLocal(data) }, [data])

  // Şrift ölçüsünü canlı tətbiq et (bu səhifədə)
  useEffect(() => {
    const px = FONT_SIZES.find(f => f.value === local.fontSize)?.px ?? 16
    document.documentElement.style.fontSize = `${px}px`
  }, [local.fontSize])

  // Navbar hash linkləri (/settings#account, /settings#adaptive) doğru bölməyə aparır.
  useEffect(() => {
    if (isLoading || !location.hash) return

    const targetId = location.hash.replace('#', '')
    if (!targetId) return

    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      target.focus({ preventScroll: true })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [isLoading, location.hash])

  const mutation = useMutation({
    mutationFn: (patch: Partial<AccessibilityConfig>) =>
      api.put<{ data: AccessibilityConfig }>(API_ROUTES.ACCESSIBILITY.UPDATE, patch).then(r => r.data.data),
    onSuccess: (cfg) => {
      qc.setQueryData(['accessibility', 'me'], cfg)
      toast.success('Saxlanıldı')
    },
    onError: () => toast.error('Saxlanmadı'),
  })

  const update = (patch: Partial<AccessibilityConfig>) => {
    setLocal(prev => ({ ...prev, ...patch }))
    mutation.mutate(patch)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Tənzimləmələr</h1>
            <p className="mt-1 text-sm text-gray-600">Profil, görünüş və adaptiv öyrənmə seçimlərini idarə et.</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-900 rounded-lg px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ← Geri
          </button>
        </div>

        {/* Account / Profile */}
        <ProfileSection />

        {/* Password change */}
        <PasswordSection />

        {/* Font size */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-900">Şrift ölçüsü</h2>
            <p className="mt-0.5 text-xs text-gray-500">Dərhal tətbiq olunur</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FONT_SIZES.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => update({ fontSize: opt.value })}
                whileTap={{ scale: 0.96 }}
                className={`py-3 rounded-xl border transition-colors flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${local.fontSize === opt.value
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                aria-pressed={local.fontSize === opt.value}
              >
                <span style={{ fontSize: opt.px, lineHeight: 1 }}>A</span>
                <span className="text-[10px] text-gray-400">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Adaptive learning / Accessibility */}
        <section id="adaptive" tabIndex={-1} className="scroll-mt-24 bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm focus:outline-none">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">♿</div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900">Xüsusi dəstək / Adaptiv öyrənmə</h2>
              <p className="mt-1 text-xs text-gray-500">
                Bu məlumat könüllüdür və tibbi diaqnoz deyil. Məqsəd platformanın görünüşünü və sual təcrübəsini istifadəçiyə daha rahat etməkdir.
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Hər dəyişiklik dərhal saxlanılır.</p>
              <p className="mt-1 text-[11px] text-gray-400">Seçimlər saxlanıldıqdan sonra platformanın görünüşü və istifadə rahatlığı buna uyğun dəyişir.</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            {TOGGLES.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </div>
                <Toggle
                  value={local[t.key] as boolean}
                  onChange={(v) => update({ [t.key]: v } as Partial<AccessibilityConfig>)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Parent → child special support */}
        {user?.role === 'parent' && <ParentChildSupport />}

        <p className="text-center text-xs text-gray-400">Görünüş və adaptiv ayarlar avtomatik saxlanılır.</p>

      </div>
    </div>
  )
}
