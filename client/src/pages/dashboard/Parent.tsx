import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Child {
  id: string
  name: string
  avatar?: string
  ageGroup: string
  level: number
  league: string
}

interface ChildStats {
  todayActive: boolean
  todayXP: number
  streak: number
  quizDone: boolean
  attendance: { thisMonth: number; total: number; lastMissed?: string }
  level: number
  league: string
  xpThisMonth: number
  totalXP: number
  rank: number
  location?: { zone: 'school' | 'home' | 'other'; updatedAt: string; showMap: boolean }
}

interface WeeklyReport {
  summary: string
  bullets: string[]
  subject: { name: string; trend: number }[]
}

interface AttendanceDay {
  date: string
  status: 'present' | 'absent' | 'distant' | 'none'
}

interface Teacher {
  id: string
  name: string
  subject: string
  avatar?: string
  unreadCount: number
  lastMessage: string
}

interface PaymentItem {
  id: string
  courseName: string
  teacherName: string
  amount: number
  status: 'paid' | 'pending'
  date: string
}

interface ActivityFeedItem {
  id: string
  icon: string
  text: string
  xp?: number
  time: string
}

interface TimeCapsule {
  id: string
  message: string
  openAt: string
  opened: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEAGUE_EMOJI: Record<string, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🔷', diamond: '💎',
}

const ZONE_META: Record<string, { label: string; color: string; dot: string }> = {
  school: { label: 'Məktəbdədir', color: 'text-emerald-400', dot: '🟢' },
  home: { label: 'Evdədir', color: 'text-blue-400', dot: '🔵' },
  other: { label: 'Başqa yerdə', color: 'text-amber-400', dot: '🟡' },
}

const ATTEND_COLOR: Record<string, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-rose-500',
  distant: 'bg-blue-500',
  none: 'bg-white/10',
}

const SHOW_PARENT_LOCATION_MAP = false

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })
}

// Kart daxili kiçik xəta/empty state-lər — backend xətasında fake data əvəzinə göstərilir.
function CardError({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="text-2xl mb-1">⚠️</div>
      <p className="text-xs text-white/50">{label}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Yenidən yoxla
        </button>
      )}
    </div>
  )
}

function CardEmpty({ label }: { label: string }) {
  return <div className="text-center py-6 text-xs text-white/40">{label}</div>
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = err && typeof err === 'object' && 'response' in err ? err.response : null
  if (!response || typeof response !== 'object' || !('data' in response)) return fallback

  const data = response.data
  if (!data || typeof data !== 'object' || !('message' in data)) return fallback

  return typeof data.message === 'string' && data.message.trim() ? data.message : fallback
}

function LinkChildModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [childEmail, setChildEmail] = useState('')
  const [error, setError] = useState('')

  const linkMutation = useMutation({
    mutationFn: (email: string) => api.post('/parent/child', { childEmail: email }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['children'] }); onClose() },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Uşaq əlavə edilmədi. Email ünvanını yoxlayıb yenidən cəhd edin.'))
    },
  })

  const handleSubmit = () => {
    const email = childEmail.trim()
    if (!email) {
      setError('Uşağın email ünvanını daxil edin.')
      return
    }
    setError('')
    linkMutation.mutate(email)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-5"
      >
        <div className="text-center">
          <div className="text-5xl mb-3">👨‍👩‍👦</div>
          <h2 className="text-lg font-bold">Uşaq Əlavə Et</h2>
          <p className="text-sm text-white/50 mt-1">Övladınızın LogiCora hesabındakı email ünvanını daxil edin</p>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-white/60">Uşaq emaili</label>
          <input
            type="email"
            value={childEmail}
            onChange={e => { setChildEmail(e.target.value); if (error) setError('') }}
            placeholder="student2@logicora.az"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 text-center"
          />
          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-colors">Ləğv et</button>
          <button onClick={handleSubmit} disabled={linkMutation.isPending}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {linkMutation.isPending ? 'Bağlanır...' : 'Bağla'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
// ── Map Modal ─────────────────────────────────────────────────────────────────

function MapModal({ location, childName, onClose }: {
  location: NonNullable<ChildStats['location']>; childName: string; onClose: () => void
}) {
  const zone = ZONE_META[location.zone]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="font-bold">{childName} — Məkan</h2>
            <p className="text-xs text-white/40">Son yenilənmə: {location.updatedAt}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white">✕</button>
        </div>

        {/* Map placeholder — Leaflet SSR issues on Vite; render a styled mock */}
        <div className="relative h-72 bg-[#0D1117] overflow-hidden">
          {/* Grid background simulating map tiles */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
          {/* Azerbaijan map outline mock */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200">
            <path d="M80,90 Q120,60 160,70 Q200,80 230,65 Q260,50 290,70 Q320,90 330,110 Q320,130 290,140 Q260,150 230,140 Q200,130 160,140 Q120,150 90,130 Z"
              fill="none" stroke="rgba(99,102,241,0.6)" strokeWidth="2" />
          </svg>

          {/* Zone indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="relative"
            >
              <div className={`w-20 h-20 rounded-full border-4 opacity-30 ${location.zone === 'school' ? 'border-emerald-400 bg-emerald-400' :
                  location.zone === 'home' ? 'border-blue-400 bg-blue-400' :
                    'border-amber-400 bg-amber-400'
                }`} />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                {location.zone === 'school' ? '🏫' : location.zone === 'home' ? '🏠' : '📍'}
              </div>
            </motion.div>
          </div>

          {/* Zone label */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2 text-center">
              <p className={`font-semibold text-sm ${zone.color}`}>{zone.dot} {zone.label}</p>
              <p className="text-xs text-white/40 mt-0.5">Son yenilənmə: {location.updatedAt}</p>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-2 text-xs text-white/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
          </svg>
          Uşağınız bu izləmənin aktiv olduğunu bilir. Şəffaflıq bizim üçün önəmlidir.
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Notification Settings ─────────────────────────────────────────────────────

interface NotifPrefs { email: boolean; sms: boolean; instant: boolean }

function NotifSettings() {
  const qc = useQueryClient()
  const [prefError, setPrefError] = useState('')

  // Backend-dən real ayarlar (Parent.notificationPreferences → { email, sms, instant }).
  const { data: prefs } = useQuery<NotifPrefs>({
    queryKey: ['notif-prefs'],
    queryFn: () => api.get<NotifPrefs>('/parent/notification-preferences').then(r => r.data),
  })

  const sms = prefs?.sms ?? true
  const email = prefs?.email ?? true
  const instant = prefs?.instant ?? true

  const prefMutation = useMutation({
    mutationFn: (next: NotifPrefs) =>
      api.put<NotifPrefs>('/parent/notification-preferences', next).then(r => r.data),
    // Optimistik: toggle dərhal görünür, amma yalnız 200-dən sonra təsdiqlənir.
    onMutate: async (next) => {
      setPrefError('')
      await qc.cancelQueries({ queryKey: ['notif-prefs'] })
      const prev = qc.getQueryData<NotifPrefs>(['notif-prefs'])
      qc.setQueryData(['notif-prefs'], next)
      return { prev }
    },
    // Xəta: əvvəlki dəyərə rollback + xəta mesajı (fake success yox).
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notif-prefs'], ctx.prev)
      setPrefError('Bildiriş ayarları saxlanmadı. Yenidən cəhd edin.')
    },
    // Uğur YALNIZ backend cavabından sonra: serverin qaytardığı dəyəri yaz.
    onSuccess: (data) => qc.setQueryData(['notif-prefs'], data),
  })

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-white/15'}`}
    >
      <motion.div animate={{ x: value ? 20 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  )

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
      <h2 className="font-bold text-sm">🔔 Bildiriş Ayarları</h2>
      {[
        { label: 'SMS bildiriş', sub: 'Telefon nömrənizə', value: sms, onChange: (v: boolean) => prefMutation.mutate({ email, sms: v, instant }) },
        { label: 'Email bildiriş', sub: 'E-poçtunuza', value: email, onChange: (v: boolean) => prefMutation.mutate({ email: v, sms, instant }) },
        { label: 'Gəlmədikdə dərhal xəbər ver', sub: 'Davamiyyət bildirişi', value: instant, onChange: (v: boolean) => prefMutation.mutate({ email, sms, instant: v }) },
      ].map(({ label, sub, value, onChange }) => (
        <div key={label} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-white/40">{sub}</p>
          </div>
          <Toggle value={value} onChange={onChange} />
        </div>
      ))}
      {prefError && <p className="text-xs text-rose-400">{prefError}</p>}
    </div>
  )
}

// ── Time Capsule Panel ────────────────────────────────────────────────────────

function TimeCapsulePanel({ childId }: { childId: string }) {
  const qc = useQueryClient()
  const [message, setMessage] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [sendError, setSendError] = useState('')

  const { data: capsules, isError: capsulesError } = useQuery({
    queryKey: ['time-capsules', childId],
    queryFn: () => api.get<TimeCapsule[]>('/parent/time-capsules').then(r => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: () => api.post('/parent/time-capsule', { childId, message, openAt }).then(r => r.data),
    // Uğur YALNIZ backend cavabından sonra: formu təmizlə + siyahını real yenilə.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-capsules', childId] })
      setMessage('')
      setOpenAt('')
      setSendError('')
    },
    // Xəta: fake uğur göstərmirik — form qalır, istifadəçiyə xəta bildirilir.
    onError: () => setSendError('Kapsul göndərilmədi. Yenidən cəhd edin.'),
  })

  return (
    <div className="bg-gradient-to-br from-purple-950/60 to-indigo-950/40 border border-purple-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">💌</span>
        <h2 className="font-bold">Zaman Kapsulu</h2>
      </div>
      <p className="text-xs text-white/50">Uşağınıza gizli mesaj yazın — seçdiyiniz tarixdə açılacaq</p>
      <textarea value={message} onChange={e => { setMessage(e.target.value); if (sendError) setSendError('') }} rows={3}
        placeholder="Sevgili Anar, bu günü xatırlayanda..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
      />
      <div className="flex gap-3">
        <input type="date" value={openAt} onChange={e => setOpenAt(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
        />
        <button onClick={() => message && openAt && sendMutation.mutate()} disabled={!message || !openAt || sendMutation.isPending}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {sendMutation.isPending ? '...' : 'Göndər'}
        </button>
      </div>
      {sendError && <p className="text-xs text-rose-400">{sendError}</p>}
      {/* Capsule list */}
      {capsulesError ? (
        <p className="text-xs text-rose-300/70 pt-2 border-t border-white/10">Kapsullar yüklənmədi.</p>
      ) : capsules && capsules.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/40">Yazılmış kapsullar</p>
          {capsules.map(cap => (
            <div key={cap.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cap.opened ? 'border-purple-500/30 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
              <span className="text-xl">{cap.opened ? '💌' : '🔒'}</span>
              <div className="flex-1 min-w-0">
                {cap.opened ? (
                  <p className="text-xs text-white/70 italic">"{cap.message}"</p>
                ) : (
                  <p className="text-xs text-white/50">Kilidli mesaj</p>
                )}
                <p className="text-xs text-white/30 mt-0.5">
                  {cap.opened ? 'Açıldı' : `Açılacaq: ${fmtDate(cap.openAt)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : capsules ? (
        <p className="text-xs text-white/40 pt-2 border-t border-white/10">Hələ kapsul yoxdur.</p>
      ) : null}
    </div>
  )
}

// ── Special Needs Panel ───────────────────────────────────────────────────────

function SpecialNeedsPanel({ childId }: { childId: string }) {
  const [answer, setAnswer] = useState<'yes' | 'no' | 'prefer_not' | null>(null)
  const [types, setTypes] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const TYPES = ['Görmə', 'Eşitmə', 'İdrak', 'Motor', 'Digər']

  // Real save: uğur YALNIZ backend 200-dən sonra; xəta udulmur, fake success yox.
  const handleSave = async () => {
    setSaveError('')
    try {
      await api.put(`/accessibility/child/${childId}`, { hasSpecialNeeds: answer === 'yes', types: answer === 'yes' ? types : [] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Ayarlar saxlanmadı. Yenidən cəhd edin.')
    }
  }

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
      <h2 className="font-bold text-sm">♿ Xüsusi Öyrənmə Ehtiyacları</h2>
      <p className="text-xs text-white/50">Bu məlumat könüllüdür. Sistem avtomatik uyğunlaşacaq.</p>
      <div className="flex gap-2 flex-wrap">
        {[['yes', 'Bəli'], ['no', 'Xeyr'], ['prefer_not', 'Cavablamaq istəmirəm']].map(([val, label]) => (
          <button key={val} onClick={() => setAnswer(val as typeof answer)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${answer === val ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/50 hover:text-white'
              }`}
          >
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {answer === 'yes' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            <p className="text-xs text-white/50">Növ seçin (birdən çox ola bilər):</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => setTypes(arr => arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t])}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${types.includes(t) ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/50 hover:text-white'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-indigo-400/80 leading-relaxed">
              💡 Sistem testi, vizual elementləri və bildiriş tonunu avtomatik uyğunlaşdıracaq
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {answer && answer !== 'prefer_not' && (
        <button onClick={handleSave}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
        >
          {saved ? '✓ Saxlandı' : 'Yadda saxla'}
        </button>
      )}
      {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { user } = useAuth()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [showLink, setShowLink] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const { data: children, isLoading: childrenLoading, isError: childrenError, refetch: refetchChildren } = useQuery({
    queryKey: ['children'],
    queryFn: () => api.get<Child[]>('/parent/children').then(r => r.data),
  })

  useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  const activeChild = children?.find(c => c.id === selectedChildId) ?? null

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['child-stats', selectedChildId],
    queryFn: () =>
      api.get<ChildStats>(`/parent/child/${selectedChildId}/stats`).then(r => r.data),
    enabled: !!selectedChildId,
  })

  const { data: report, isError: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['weekly-report', selectedChildId],
    queryFn: () => api.get<WeeklyReport>('/parent/weekly-report').then(r => r.data),
    enabled: !!selectedChildId,
  })

  const { data: attendance, isError: attendanceError, refetch: refetchAttendance } = useQuery({
    queryKey: ['child-attendance', selectedChildId],
    queryFn: () =>
      api.get<AttendanceDay[]>(`/parent/child/${selectedChildId}/attendance`).then(r => r.data),
    enabled: !!selectedChildId,
  })

  const { data: teachers, isError: teachersError, refetch: refetchTeachers } = useQuery({
    queryKey: ['parent-teachers', selectedChildId],
    queryFn: () => api.get<Teacher[]>(`/parent/child/${selectedChildId}/teachers`).then(r => r.data),
    enabled: !!selectedChildId,
  })

  const { data: payments, isError: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ['parent-payments', selectedChildId],
    queryFn: () => api.get<PaymentItem[]>(`/parent/payments`).then(r => r.data),
    enabled: !!selectedChildId,
  })

  const { data: feed, isError: feedError, refetch: refetchFeed } = useQuery({
    queryKey: ['child-feed', selectedChildId],
    queryFn: () =>
      api.get<ActivityFeedItem[]>(`/parent/child/${selectedChildId}/activity`).then(r => r.data),
    enabled: !!selectedChildId,
  })

  // Sidebar/mobil tab parent linkləri #section hash ilə gəlir → uyğun bölməyə yumşaq scroll.
  // Data async yükləndiyi üçün stats/attendance/payments dəyişəndə də yenidən cəhd edirik.
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => clearTimeout(t)
  }, [location.hash, stats, report, attendance, payments, children])

  // ── Error state — children gətirilə bilmədi (fake uşaq göstərmirik) ──────────
  if (childrenError) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="text-7xl mx-auto">⚠️</div>
          <div>
            <h1 className="text-2xl font-bold">Övlad məlumatları yüklənmədi</h1>
            <p className="text-white/50 text-sm mt-2">Zəhmət olmasa yenidən cəhd edin.</p>
          </div>
          <button onClick={() => refetchChildren()}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl font-bold text-lg transition-all"
          >
            🔄 Yenidən yoxla
          </button>
        </div>
      </div>
    )
  }

  // ── Empty state — no children ───────────────────────────────────────────────
  if (!childrenLoading && (!children || children.length === 0)) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-5 max-w-sm">
          {/* Cora sad */}
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
            className="text-8xl mx-auto"
          >😔</motion.div>
          <div>
            <h1 className="text-2xl font-bold">Hələ övlad əlavə edilməyib</h1>
            <p className="text-white/50 text-sm mt-2">
              Cora deyir: "Övladınızın inkişafını birlikdə izləyək!"
            </p>
          </div>
          <button onClick={() => setShowLink(true)}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl font-bold text-lg transition-all"
          >
            👨‍👩‍👦 Uşaq Əlavə Et
          </button>
        </div>
        <AnimatePresence>
          {showLink && <LinkChildModal onClose={() => setShowLink(false)} />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header (Övladım bölməsi) ───────────────────────────────── */}
        <div id="child-section" className="scroll-mt-24 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Salam, {user?.name?.split(' ')[0] ?? 'Valideyn'}!
              </span>{' '}👋
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              Cora deyir: "Övladınızın bu günkü vəziyyəti:"
            </p>
          </div>
          <button onClick={() => setShowLink(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/15 hover:border-white/30 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
          >
            + Uşaq əlavə et
          </button>
        </div>

        {/* ── Child selector ─────────────────────────────────────────── */}
        {children && children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {children.map(child => (
              <button key={child.id} onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shrink-0 ${selectedChildId === child.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                  }`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                  {child.name[0]}
                </div>
                <span className="text-sm font-medium">{child.name}</span>
                {selectedChildId === child.id && <span className="text-xs">{LEAGUE_EMOJI[child.league]}</span>}
              </button>
            ))}
          </div>
        )}

        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : statsError ? (
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
            <CardError label="Övladın məlumatları yüklənmədi." onRetry={() => refetchStats()} />
          </div>
        ) : stats && activeChild ? (
          <>
            {/* ── Stats Row ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-x-auto">
              {/* Card 1 — Daily activity */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                className={`bg-[#141414] border rounded-2xl p-4 ${stats.todayActive ? 'border-emerald-500/30' : 'border-amber-500/30'}`}
              >
                <p className="text-xs text-white/50 mb-2">Bu günkü aktivlik</p>
                <div className="text-2xl mb-1">{stats.todayActive ? '✅' : '⏰'}</div>
                <p className="text-sm font-bold">{stats.todayActive ? 'Aktiv!' : 'Hələ girməyib'}</p>
                <p className="text-xs text-white/40 mt-1">
                  {stats.todayActive
                    ? `🔥 ${stats.streak} gün · +${stats.todayXP} XP`
                    : 'Bildiriş göndər'}
                </p>
                {stats.quizDone && <p className="text-xs text-emerald-400 mt-1">Quiz ✓</p>}
              </motion.div>

              {/* Card 2 — Attendance */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                className="bg-[#141414] border border-white/10 rounded-2xl p-4"
              >
                <p className="text-xs text-white/50 mb-2">Davamiyyət</p>
                <p className="text-2xl font-bold">
                  {stats.attendance.thisMonth}
                  <span className="text-sm text-white/30">/{stats.attendance.total} gün</span>
                </p>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: stats.attendance.thisMonth / stats.attendance.total > 0.8 ? '#10B981' : stats.attendance.thisMonth / stats.attendance.total > 0.6 ? '#F59E0B' : '#EF4444' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.attendance.thisMonth / stats.attendance.total) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                {stats.attendance.lastMissed && (
                  <p className="text-xs text-white/30 mt-1">Son: {fmtDate(stats.attendance.lastMissed)}</p>
                )}
                <Link to={`/child/${selectedChildId}/progress`} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block transition-colors">
                  Tam jurnal →
                </Link>
              </motion.div>

              {/* Card 3 — Level & XP */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                className="bg-[#141414] border border-white/10 rounded-2xl p-4"
              >
                <p className="text-xs text-white/50 mb-2">Səviyyə & XP</p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">{stats.level}</p>
                  <span className="text-xl">{LEAGUE_EMOJI[stats.league]}</span>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${(stats.totalXP % 1000) / 10}%` }} transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs text-white/40 mt-1">Bu ay +{stats.xpThisMonth.toLocaleString()} XP</p>
              </motion.div>

              {/* Card 4 — Location */}
              {SHOW_PARENT_LOCATION_MAP && stats.location?.showMap ? (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="bg-[#141414] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => setShowMap(true)}
                >
                  <p className="text-xs text-white/50 mb-2">Yer mövqeyi</p>
                  <div className="h-12 bg-indigo-950/50 rounded-xl flex items-center justify-center mb-2 text-2xl">
                    {stats.location.zone === 'school' ? '🏫' : stats.location.zone === 'home' ? '🏠' : '📍'}
                  </div>
                  <p className={`text-xs font-semibold ${ZONE_META[stats.location.zone].color}`}>
                    {ZONE_META[stats.location.zone].dot} {ZONE_META[stats.location.zone].label}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{stats.location.updatedAt}</p>
                  <p className="text-xs text-indigo-400 mt-1">Canlı izlə →</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
                  className="bg-[#141414] border border-white/10 rounded-2xl p-4"
                >
                  <p className="text-xs text-white/50 mb-2">Milli Reyting</p>
                  <p className="text-3xl font-bold text-indigo-300">#{stats.rank}</p>
                  <p className="text-xs text-white/40 mt-1">Platforma üzrə</p>
                </motion.div>
              )}
            </div>

            {/* ── Weekly AI Report ────────────────────────────────────── */}
            {reportError ? (
              <div id="progress-section" className="scroll-mt-24 bg-[#141414] border border-white/10 rounded-2xl p-5">
                <CardError label="Həftəlik hesabat yüklənmədi." onRetry={() => refetchReport()} />
              </div>
            ) : report ? (
              <motion.div id="progress-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="scroll-mt-24 bg-gradient-to-br from-amber-950/50 to-orange-950/30 border border-amber-500/30 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🌟</div>
                    <div className="flex-1">
                      <p className="text-xs text-amber-400 font-semibold mb-1">Cora — Bu həftənin xülasəsi</p>
                      <p className="text-sm text-white/80 leading-relaxed mb-3">{report.summary}</p>
                      <ul className="space-y-1.5">
                        {report.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                            <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Link to={`/child/${selectedChildId}/progress`}
                    className="shrink-0 px-3 py-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-xs text-amber-300 hover:bg-amber-500/30 transition-colors"
                  >
                    Tam →
                  </Link>
                </div>
              </motion.div>
            ) : null}

            {/* ── Main grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2/3 */}
              <div className="lg:col-span-2 space-y-5">
                {/* Attendance week grid */}
                <div id="attendance-section" className="scroll-mt-24 bg-[#141414] border border-white/10 rounded-2xl p-5">
                  <h2 className="font-bold text-sm mb-4">📋 Son Davamiyyət</h2>
                  {attendanceError ? (
                    <CardError label="Davamiyyət yüklənmədi." onRetry={() => refetchAttendance()} />
                  ) : attendance && attendance.length > 0 ? (
                    <>
                      <div className="flex gap-1.5 flex-wrap">
                        {attendance.slice(-14).map((day, i) => (
                          <div key={i} className="group relative">
                            <div className={`w-8 h-8 rounded-lg ${ATTEND_COLOR[day.status]}`} title={`${fmtDate(day.date)}: ${day.status}`} />
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                              {fmtDate(day.date)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-white/40">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Gəldi</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Gəlmədi</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Distant</span>
                      </div>
                    </>
                  ) : attendance ? (
                    <CardEmpty label="Hələ davamiyyət qeydi yoxdur." />
                  ) : null}
                  <NotifSettings />
                </div>

                {/* Activity feed */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                  <h2 className="font-bold text-sm mb-4">⚡ Son Aktivliklər</h2>
                  {feedError ? (
                    <CardError label="Aktivliklər yüklənmədi." onRetry={() => refetchFeed()} />
                  ) : feed && feed.length > 0 ? (
                    <div className="space-y-2">
                      {feed.map((item, i) => (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                          className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl"
                        >
                          <span className="text-xl shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.text}</p>
                            <p className="text-xs text-white/30">{item.time}</p>
                          </div>
                          {item.xp && (
                            <span className="text-xs text-emerald-400 font-semibold shrink-0">+{item.xp} XP</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : feed ? (
                    <CardEmpty label="Hələ aktivlik yoxdur." />
                  ) : null}
                </div>

                {/* Time capsule */}
                {selectedChildId && <TimeCapsulePanel childId={selectedChildId} />}

                {/* Special needs */}
                {selectedChildId && <SpecialNeedsPanel childId={selectedChildId} />}
              </div>

              {/* Right 1/3 */}
              <div className="space-y-5">
                {/* Teachers */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
                  <h2 className="font-bold text-sm mb-4">👨‍🏫 Müəllimlər</h2>
                  {teachersError ? (
                    <CardError label="Müəllimlər yüklənmədi." onRetry={() => refetchTeachers()} />
                  ) : teachers && teachers.length > 0 ? (
                    <div className="space-y-3">
                      {teachers.map(teacher => (
                        <div key={teacher.id} className="flex items-start gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-indigo-600/60 flex items-center justify-center text-sm font-bold shrink-0 relative">
                            {teacher.name[0]}
                            {teacher.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                                {teacher.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{teacher.name}</p>
                            <p className="text-xs text-white/40">{teacher.subject}</p>
                            <p className="text-xs text-white/30 mt-0.5 truncate">{teacher.lastMessage}</p>
                          </div>
                          <Link to="/chat" className="text-xs text-indigo-400 border border-indigo-400/30 px-2 py-1 rounded-lg hover:bg-indigo-400/10 transition-colors shrink-0">
                            Mesaj
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : teachers ? (
                    <CardEmpty label="Hələ müəllim yoxdur." />
                  ) : null}
                </div>

                {/* Payments */}
                <div id="payments-section" className="scroll-mt-24 bg-[#141414] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm">💳 Ödənişlər</h2>
                    <span className="text-xs bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full">Tezliklə</span>
                  </div>
                  {paymentsError ? (
                    <CardError label="Ödənişlər yüklənmədi." onRetry={() => refetchPayments()} />
                  ) : payments && payments.length > 0 ? (
                    <div className="space-y-2">
                      {payments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.courseName}</p>
                            <p className="text-xs text-white/30">{p.teacherName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold">{p.amount} ₼</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {p.status === 'paid' ? 'Ödənildi' : 'Gözlənilir'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : payments ? (
                    <CardEmpty label="Hələ ödəniş yoxdur." />
                  ) : null}
                  <button className="w-full mt-3 py-2 border border-white/10 rounded-xl text-xs text-white/40 cursor-not-allowed">
                    Ödəniş et (Tezliklə)
                  </button>
                </div>

                {/* Quick navigate */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-2">
                  <h2 className="font-bold text-sm mb-3">Sürətli Keçidlər</h2>
                  {[
                    { icon: '📊', label: 'Tam irəliləyiş', to: `/child/${selectedChildId}/progress` },
                    { icon: '💬', label: 'Müəllim ilə chat', to: '/chat' },
                    { icon: '📋', label: 'Davamiyyət jurnalı', to: `/child/${selectedChildId}/progress` },
                  ].map(({ icon, label, to }) => (
                    <Link key={to + label} to={to}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-colors"
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-sm">{label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-white/30">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showLink && <LinkChildModal onClose={() => setShowLink(false)} />}
        {showMap && stats?.location && activeChild && (
          <MapModal location={stats.location} childName={activeChild.name} onClose={() => setShowMap(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
