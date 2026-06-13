import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { API_ROUTES, APP_ROUTES } from '../../constants'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupMember {
  id: string
  name: string
  avatar?: string
  level: number
  attendancePct: number
  xpThisWeek: number
  portfolioLink?: string
}

interface AttendanceRecord {
  userId: string
  status: 'present' | 'absent' | 'distant' | 'late'
}

interface AttendanceDay {
  date: string
  records: AttendanceRecord[]
}

interface GroupCompetition {
  id: string
  title: string
  date: string
  participantCount: number
  avgScore: number
}

interface Group {
  id: string
  name: string
  color: string
  subject: string
  memberCount: number
  maxMembers: number
  isActive: boolean
  nextLesson?: { date: string; time: string }
  attendancePct: number
  schedule: { day: string; time: string }[]
}

interface GroupDetail extends Group {
  members: GroupMember[]
  attendanceDays: AttendanceDay[]
  competitions: GroupCompetition[]
  analytics: {
    xpTrend: { week: string; avgXP: number }[]
    subjectBreakdown: { name: string; value: number }[]
    topStudent: GroupMember | null
    weakStudent: GroupMember | null
    monthlyAttendance: { month: string; pct: number }[]
  }
}

interface CreateGroupForm {
  name: string
  subject: string
  days: string[]
  time: string
  maxMembers: number
}

const DAYS_AZ = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə']
const SUBJECTS = ['Python', 'Django', 'JavaScript', 'Data Science', 'Web Dizayn', 'Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix']
const PIE_COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateGroupForm>({ name: '', subject: SUBJECTS[0], days: [], time: '10:00', maxMembers: 25 })

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupForm) => api.post(API_ROUTES.GROUPS.CREATE, data).then(r => r.data),
    // Uğur YALNIZ backend cavabından sonra: bildiriş + siyahını yenilə + modalı bağla.
    onSuccess: () => { toast.success('Qrup yaradıldı.'); qc.invalidateQueries({ queryKey: ['groups'] }); onClose() },
    // Xəta: fake uğur yox — modal açıq qalır, istifadəçiyə xəta bildirilir.
    onError: () => toast.error('Qrup yaradılmadı. Yenidən cəhd edin.'),
  })

  const toggleDay = (day: string) =>
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold">Yeni Qrup Yarat</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Qrup adı</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="məs. 9A Python Qrupu" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Fənn</label>
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {SUBJECTS.map(s => <option key={s} value={s} className="bg-[#141414]">{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-2">Dərs günləri</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_AZ.map(day => (
                <button key={day} onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.days.includes(day) ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Saat</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Maks. tələbə</label>
              <input type="number" value={form.maxMembers} min={5} max={50}
                onChange={e => setForm(f => ({ ...f, maxMembers: +e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white transition-colors">Ləğv et</button>
          <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? 'Yaradılır...' : 'Yarat'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Group Drawer Tabs ──────────────────────────────────────────────────────────

type DrawerTab = 'members' | 'attendance' | 'competitions' | 'analytics'

function MembersTab({ group, detail }: { group: Group; detail: GroupDetail }) {
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(API_ROUTES.GROUPS.INVITE(group.id), { email }).then(r => r.data),
    // Uğur yalnız backend cavabından sonra: input təmizlə + üzv siyahısını yenilə.
    onSuccess: () => { toast.success('Dəvət göndərildi.'); setInviteEmail(''); qc.invalidateQueries({ queryKey: ['group-detail', group.id] }) },
    onError: () => toast.error('Tələbə dəvət olunmadı.'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(API_ROUTES.GROUPS.REMOVE(group.id, userId)).then(r => r.data),
    onSuccess: () => { toast.success('Tələbə çıxarıldı.'); qc.invalidateQueries({ queryKey: ['group-detail', group.id] }); setConfirmRemove(null) },
    onError: () => { toast.error('Tələbə çıxarılmadı.'); setConfirmRemove(null) },
  })

  return (
    <div className="space-y-4">
      {/* Invite */}
      <div className="flex gap-2">
        <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
          placeholder="tələbə@email.com"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <button onClick={() => inviteEmail && inviteMutation.mutate(inviteEmail)} disabled={!inviteEmail || inviteMutation.isPending}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {inviteMutation.isPending ? '...' : 'Dəvət et'}
        </button>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {detail.members.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl hover:border-white/15 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              {member.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
                <span>Lv {member.level}</span>
                <span>·</span>
                <span className={member.attendancePct < 70 ? 'text-rose-400' : 'text-emerald-400'}>{member.attendancePct}% davamiyyət</span>
                <span>·</span>
                <span>+{member.xpThisWeek} XP</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {member.portfolioLink && (
                <a href={`/portfolio/${member.portfolioLink}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-400 border border-indigo-400/30 px-2 py-1 rounded-lg hover:bg-indigo-400/10 transition-colors"
                >Profil</a>
              )}
              <button onClick={() => setConfirmRemove(member.id)}
                className="text-xs text-rose-400 border border-rose-400/30 px-2 py-1 rounded-lg hover:bg-rose-400/10 transition-colors"
              >Çıxar</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Confirm remove */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#1A1A1A] border border-white/15 rounded-2xl p-6 max-w-xs w-full text-center space-y-4"
            >
              <p className="text-lg font-bold">Tələbəni çıxar?</p>
              <p className="text-sm text-white/60">Bu əməliyyat geri qaytarıla bilməz.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2 border border-white/10 rounded-xl text-sm">Ləğv et</button>
                <button onClick={() => removeMutation.mutate(confirmRemove!)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-sm font-semibold transition-colors"
                >Çıxar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AttendanceTab({ group, detail }: { group: Group; detail: GroupDetail }) {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(detail.attendanceDays[0]?.date ?? '')
  const [records, setRecords] = useState<Record<string, AttendanceRecord['status']>>(() => {
    const day = detail.attendanceDays.find(d => d.date === selectedDate)
    return Object.fromEntries((day?.records ?? []).map(r => [r.userId, r.status]))
  })

  const saveMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.GROUPS.ATTENDANCE(group.id), { date: selectedDate, records: Object.entries(records).map(([userId, status]) => ({ userId, status })) }).then(r => r.data),
    // Uğur yalnız backend cavabından sonra (düymə "✓ Saxlandı" isSuccess ilə işləyir).
    onSuccess: () => { toast.success('Davamiyyət saxlanıldı.'); qc.invalidateQueries({ queryKey: ['group-detail', group.id] }) },
    onError: () => toast.error('Davamiyyət saxlanmadı.'),
  })

  const STATUS_OPTS: { value: AttendanceRecord['status']; label: string; color: string }[] = [
    { value: 'present', label: '✅ Gəldi', color: 'text-emerald-400' },
    { value: 'absent', label: '❌ Gəlmədi', color: 'text-rose-400' },
    { value: 'distant', label: '💻 Distant', color: 'text-blue-400' },
    { value: 'late', label: '🕐 Gecikdi', color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saxlanır...' : saveMutation.isSuccess ? '✓ Saxlandı' : 'Jurnalı Saxla'}
        </button>
      </div>

      <div className="space-y-2">
        {detail.members.map(member => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600/60 flex items-center justify-center text-xs font-bold shrink-0">{member.name[0]}</div>
            <p className="text-sm font-medium flex-1">{member.name}</p>
            <div className="flex gap-1">
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setRecords(r => ({ ...r, [member.id]: opt.value }))}
                  title={opt.label}
                  className={`text-lg transition-all ${records[member.id] === opt.value ? 'scale-125' : 'opacity-30 hover:opacity-70'}`}
                >
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly attendance chart */}
      <div>
        <p className="text-xs text-white/40 mb-2">Aylıq Davamiyyət (%)</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={detail.analytics.monthlyAttendance} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
              <Bar dataKey="pct" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function CompetitionsTab({ group, detail }: { group: Group; detail: GroupDetail }) {
  return (
    <div className="space-y-4">
      <a href={`/competition/create?groupId=${group.id}`}
        className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
      >
        + Yeni Yarış Yarat
      </a>
      {detail.competitions.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <div className="text-5xl mb-3">🏆</div>
          <p>Bu qrup üçün hələ yarış yoxdur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {detail.competitions.map((comp, i) => (
            <motion.div key={comp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="text-3xl">🏆</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{comp.title}</p>
                <p className="text-xs text-white/40">{fmtDate(comp.date)} · {comp.participantCount} iştirakçı</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-indigo-300">{comp.avgScore}</p>
                <p className="text-xs text-white/30">ort. xal</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyticsTab({ detail }: { detail: GroupDetail }) {
  return (
    <div className="space-y-6">
      {/* XP trend */}
      <div>
        <p className="text-sm font-semibold mb-3">Ortalama XP Dinamikası</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={detail.analytics.xpTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
              <Line type="monotone" dataKey="avgXP" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="flex gap-6 items-center">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={detail.analytics.subjectBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={56} innerRadius={32}>
                {detail.analytics.subjectBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {detail.analytics.subjectBreakdown.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-white/70">{s.name}</span>
              <span className="ml-auto text-white/40">{s.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top + weak */}
      <div className="grid grid-cols-2 gap-3">
        {detail.analytics.topStudent && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-xs text-emerald-400 font-semibold mb-1.5">⭐ Ən Güclü</p>
            <p className="text-sm font-medium">{detail.analytics.topStudent.name}</p>
            <p className="text-xs text-white/40">+{detail.analytics.topStudent.xpThisWeek} XP bu həftə</p>
          </div>
        )}
        {detail.analytics.weakStudent && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <p className="text-xs text-rose-400 font-semibold mb-1.5">⚠️ Diqqət Tələb Edir</p>
            <p className="text-sm font-medium">{detail.analytics.weakStudent.name}</p>
            <p className="text-xs text-white/40">{detail.analytics.weakStudent.attendancePct}% davamiyyət</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Group Drawer ───────────────────────────────────────────────────────────────

function GroupDrawer({ group, onClose }: { group: Group; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('members')

  const { data: detail, isLoading, isError: detailError } = useQuery<GroupDetail>({
    queryKey: ['group-detail', group.id],
    // Real cavab GroupDetail-in bütün sahələrini verməyə bilər → təhlükəsiz default-larla normalize (fake yox, boş).
    queryFn: () => api.get<Partial<GroupDetail>>(API_ROUTES.GROUPS.BY_ID(group.id)).then(r => {
      const d: Partial<GroupDetail> = r.data ?? {}
      return {
        ...group,
        ...d,
        members:        Array.isArray(d.members) ? d.members : [],
        attendanceDays: Array.isArray(d.attendanceDays) ? d.attendanceDays : [],
        competitions:   Array.isArray(d.competitions) ? d.competitions : [],
        analytics:      d.analytics ?? { xpTrend: [], subjectBreakdown: [], topStudent: null, weakStudent: null, monthlyAttendance: [] },
      } as GroupDetail
    }),
  })

  const TABS: { key: DrawerTab; label: string }[] = [
    { key: 'members', label: '👥 Tələbələr' },
    { key: 'attendance', label: '📋 Davamiyyət' },
    { key: 'competitions', label: '🏆 Yarışlar' },
    { key: 'analytics', label: '📊 Analitika' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-xl bg-[#111111] h-full overflow-y-auto border-l border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
            <div>
              <h2 className="font-bold">{group.name}</h2>
              <p className="text-xs text-white/40">{group.memberCount}/{group.maxMembers} tələbə · {group.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/10 shrink-0 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div layoutId="drawer-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl" />)}
            </div>
          ) : detailError ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">⚠️</div>
              <p className="text-white/60 text-sm">Qrup məlumatı yüklənmədi.</p>
            </div>
          ) : detail ? (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {activeTab === 'members' && <MembersTab group={group} detail={detail} />}
                {activeTab === 'attendance' && <AttendanceTab group={group} detail={detail} />}
                {activeTab === 'competitions' && <CompetitionsTab group={group} detail={detail} />}
                {activeTab === 'analytics' && <AnalyticsTab detail={detail} />}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ group, onClick }: { group: Group; onClick: () => void }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors cursor-pointer" onClick={onClick}>
      {/* Color accent */}
      <div className="h-1" style={{ backgroundColor: group.color }} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-sm">{group.name}</h3>
            <p className="text-xs text-white/50 mt-0.5">{group.subject}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
            {group.isActive ? 'Aktiv' : 'Passiv'}
          </span>
        </div>

        {/* Member count */}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span>👥 {group.memberCount}/{group.maxMembers} tələbə</span>
          {group.nextLesson && (
            <>
              <span>·</span>
              <span>📅 {fmtDate(group.nextLesson.date)} {group.nextLesson.time}</span>
            </>
          )}
        </div>

        {/* Attendance */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Davamiyyət</span>
            <span className={group.attendancePct >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{group.attendancePct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: group.attendancePct >= 80 ? '#10B981' : '#F59E0B' }}
              initial={{ width: 0 }} animate={{ width: `${group.attendancePct}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        <button className="w-full py-2 text-xs border border-white/10 hover:border-white/20 rounded-xl text-white/60 hover:text-white transition-colors" onClick={onClick}>
          Qrupa gir →
        </button>
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GroupManagement() {
  const [showCreate, setShowCreate] = useState(false)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const navigate = useNavigate()

  const { data: groups, isLoading, isError, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<Group[]>(API_ROUTES.GROUPS.LIST).then(r => r.data),
  })

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Qrup İdarəetməsi</h1>
            <p className="text-white/40 text-sm mt-0.5">{groups?.length ?? 0} qrup · {groups?.reduce((s, g) => s + g.memberCount, 0) ?? 0} tələbə</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
          >
            + Yeni Qrup
          </button>
        </div>

        {/* Group grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-xl font-bold">Qruplar yüklənmədi</h2>
            <p className="text-white/50 text-sm max-w-xs">Zəhmət olmasa yenidən cəhd edin.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(APP_ROUTES.DASHBOARD.TEACHER)} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors">Dashboard-a qayıt</button>
              <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors">Yenidən yoxla</button>
            </div>
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group, i) => (
              <motion.div key={group.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GroupCard group={group} onClick={() => setActiveGroup(group)} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-7xl">👥</div>
            <h2 className="text-xl font-bold">Hələ qrup yaradılmayıb</h2>
            <p className="text-white/50 text-sm max-w-xs">Tələbələrinizi qruplara bölərək daha effektiv izləyin</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-colors">
              Qrup yarat
            </button>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <AnimatePresence>
        {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
        {activeGroup && <GroupDrawer group={activeGroup} onClose={() => setActiveGroup(null)} />}
      </AnimatePresence>
    </div>
  )
}
