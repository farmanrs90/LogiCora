import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar,
  RadialBarChart, RadialBar, Funnel, FunnelChart, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import api from '../../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year'

interface MetricCard {
  label: string
  value: string
  trend: number
  sub: string
}

interface StudentProgress {
  id: string
  name: string
  avatar?: string
  xpGain: number
  xpGainPct: number
  lastSeen: string
  attendancePct: number
}

interface CourseAnalytics {
  id: string
  title: string
  enrollCount: number
  activeCount: number
  completedCount: number
  avgRating: number
  weeklyEnroll: { week: string; count: number }[]
  mostWatchedLesson: string
  mostSkippedLesson: string
  ratingTrend: { month: string; avg: number }[]
}

interface StorefrontPerf {
  profileViews: number
  invitesSent: number
  invitesAccepted: number
  isFeatured: boolean
  featuredDaysLeft?: number
}

interface ImpactBreakdown {
  name: string
  value: number
  fill: string
}

interface GroupXP {
  group: string
  color: string
  data: { week: string; avgXP: number }[]
}

interface AnalyticsData {
  metrics: MetricCard[]
  groupXP: GroupXP[]
  topStudents: StudentProgress[]
  weakStudents: StudentProgress[]
  courses: CourseAnalytics[]
  storefront: StorefrontPerf
  impactBreakdown: ImpactBreakdown[]
  aiAdvice: string
}

// ── Mock ──────────────────────────────────────────────────────────────────────

const MOCK: AnalyticsData = {
  metrics: [
    { label: 'Ümumi Tələbə', value: '248', trend: 14, sub: 'bu ay artım' },
    { label: 'Ort. Davamiyyət', value: '87%', trend: 3, sub: 'keçən aya görə' },
    { label: 'Ort. XP Artımı', value: '340 XP', trend: 8, sub: 'tələbə başına' },
    { label: 'Kurs Tamamlanma', value: '62%', trend: -2, sub: 'keçən aya görə' },
  ],
  groupXP: [
    { group: '9A', color: '#6366F1', data: [{ week: 'H1', avgXP: 280 }, { week: 'H2', avgXP: 340 }, { week: 'H3', avgXP: 310 }, { week: 'H4', avgXP: 420 }] },
    { group: '11B', color: '#8B5CF6', data: [{ week: 'H1', avgXP: 320 }, { week: 'H2', avgXP: 360 }, { week: 'H3', avgXP: 390 }, { week: 'H4', avgXP: 440 }] },
    { group: 'Onlayn', color: '#06B6D4', data: [{ week: 'H1', avgXP: 180 }, { week: 'H2', avgXP: 210 }, { week: 'H3', avgXP: 195 }, { week: 'H4', avgXP: 260 }] },
  ],
  topStudents: [
    { id: 's1', name: 'Anar Hüseynov', xpGain: 640, xpGainPct: 28, lastSeen: '1 saat əvvəl', attendancePct: 95 },
    { id: 's2', name: 'Tural Rəsulzadə', xpGain: 520, xpGainPct: 22, lastSeen: '3 saat əvvəl', attendancePct: 91 },
    { id: 's3', name: 'Leyla Quliyeva', xpGain: 420, xpGainPct: 18, lastSeen: '45 dəq əvvəl', attendancePct: 88 },
    { id: 's4', name: 'Günel Həsənova', xpGain: 380, xpGainPct: 16, lastSeen: '2 saat əvvəl', attendancePct: 92 },
    { id: 's5', name: 'Rauf İsmayılov', xpGain: 340, xpGainPct: 14, lastSeen: '5 saat əvvəl', attendancePct: 85 },
  ],
  weakStudents: [
    { id: 'w1', name: 'Nigar Əliyeva', xpGain: 80, xpGainPct: 3, lastSeen: '2 gün əvvəl', attendancePct: 60 },
    { id: 'w2', name: 'Orxan Məmmədov', xpGain: 40, xpGainPct: 2, lastSeen: '5 gün əvvəl', attendancePct: 55 },
    { id: 'w3', name: 'Samir Bağırov', xpGain: 120, xpGainPct: 5, lastSeen: '3 gün əvvəl', attendancePct: 68 },
  ],
  courses: [
    {
      id: 'c1', title: 'Python ilə Proqramlaşdırma',
      enrollCount: 2840, activeCount: 1960, completedCount: 1760, avgRating: 4.8,
      weeklyEnroll: [{ week: 'H1', count: 40 }, { week: 'H2', count: 55 }, { week: 'H3', count: 38 }, { week: 'H4', count: 62 }],
      mostWatchedLesson: 'Dərs 3: Funksiyalar',
      mostSkippedLesson: 'Dərs 14: Dekoratorlar',
      ratingTrend: [{ month: 'Yan', avg: 4.6 }, { month: 'Fev', avg: 4.7 }, { month: 'Mar', avg: 4.8 }, { month: 'Apr', avg: 4.8 }],
    },
    {
      id: 'c2', title: 'Django REST API',
      enrollCount: 1640, activeCount: 980, completedCount: 790, avgRating: 4.9,
      weeklyEnroll: [{ week: 'H1', count: 28 }, { week: 'H2', count: 32 }, { week: 'H3', count: 25 }, { week: 'H4', count: 41 }],
      mostWatchedLesson: 'Dərs 5: Serializers',
      mostSkippedLesson: 'Dərs 18: Celery',
      ratingTrend: [{ month: 'Yan', avg: 4.7 }, { month: 'Fev', avg: 4.8 }, { month: 'Mar', avg: 4.9 }, { month: 'Apr', avg: 4.9 }],
    },
  ],
  storefront: {
    profileViews: 1240, invitesSent: 48, invitesAccepted: 31, isFeatured: false,
  },
  impactBreakdown: [
    { name: 'Davamiyyət', value: 23, fill: '#6366F1' },
    { name: 'XP Artımı', value: 31, fill: '#8B5CF6' },
    { name: 'Kurs tamamlanma', value: 28, fill: '#06B6D4' },
    { name: 'Yarış nəticəsi', value: 18, fill: '#F59E0B' },
  ],
  aiAdvice: 'Kurs tamamlanma faizini artırmaq üçün "Dekoratorlar" dərsinə əlavə video izahat əlavə etməyi tövsiyə edirik. Nigar və Orxan\'ın valideynlərinə vaxtında bildiriş göndərməyi düşünün.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeGroupXP(groups: GroupXP[]): object[] {
  const weeks = groups[0]?.data.map(d => d.week) ?? []
  return weeks.map((week, i) => {
    const row: Record<string, string | number> = { week }
    groups.forEach(g => { row[g.group] = g.data[i]?.avgXP ?? 0 })
    return row
  })
}

// ── Period Selector ───────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
      {(['week', 'month', 'year'] as Period[]).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${value === p ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
        >
          {p === 'week' ? 'Bu Həftə' : p === 'month' ? 'Bu Ay' : 'Bu İl'}
        </button>
      ))}
    </div>
  )
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ metric, delay }: { metric: MetricCard; delay: number }) {
  const isUp = metric.trend >= 0
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
    >
      <p className="text-xs text-white/50 mb-2">{metric.label}</p>
      <p className="text-3xl font-bold mb-1">{metric.value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(metric.trend)}%
        </span>
        <span className="text-xs text-white/30">{metric.sub}</span>
      </div>
    </motion.div>
  )
}

// ── Student Row ───────────────────────────────────────────────────────────────

function StudentRow({ student, rank, isWeak }: { student: StudentProgress; rank?: number; isWeak?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl hover:border-white/15 transition-colors">
      {rank && (
        <span className={`text-sm font-bold w-6 text-center shrink-0 ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/40'}`}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </span>
      )}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
        {student.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{student.name}</p>
        <p className="text-xs text-white/40">{student.lastSeen}</p>
      </div>
      {!isWeak ? (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-400">+{student.xpGain} XP</p>
          <p className="text-xs text-white/30">+{student.xpGainPct}%</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs text-rose-400">{student.attendancePct}% davamiyyət</p>
            <p className="text-xs text-white/30">{student.lastSeen}</p>
          </div>
          <button className="text-xs text-amber-400 border border-amber-400/30 px-2 py-1 rounded-lg hover:bg-amber-400/10 transition-colors">
            Mesaj
          </button>
        </div>
      )}
    </div>
  )
}

// ── Course Analytics Card ──────────────────────────────────────────────────────

function CourseAnalyticsCard({ course }: { course: CourseAnalytics }) {
  const [expanded, setExpanded] = useState(false)
  const funnelData = [
    { name: 'Qeydiyyat', value: course.enrollCount, fill: '#6366F1' },
    { name: 'Aktiv', value: course.activeCount, fill: '#8B5CF6' },
    { name: 'Tamamlandı', value: course.completedCount, fill: '#10B981' },
  ]

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
      <button className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div>
          <p className="font-semibold">{course.title}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {course.enrollCount.toLocaleString()} qeydiyyat · ⭐ {course.avgRating}
          </p>
        </div>
        <motion.svg animate={{ rotate: expanded ? 180 : 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 shrink-0">
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5 border-t border-white/8 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Funnel */}
                <div>
                  <p className="text-xs text-white/40 mb-2">Tamamlanma Funnel</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                        <Funnel dataKey="value" data={funnelData} isAnimationActive>
                          <LabelList position="right" fill="rgba(255,255,255,0.6)" stroke="none" fontSize={11} dataKey="name" />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Weekly enroll */}
                <div>
                  <p className="text-xs text-white/40 mb-2">Həftəlik Qeydiyyat</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={course.weeklyEnroll} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                        <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                        <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              {/* Lesson insights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-xs text-emerald-400 font-semibold mb-1">🎯 Ən Çox Baxılan</p>
                  <p className="text-xs text-white/70">{course.mostWatchedLesson}</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <p className="text-xs text-rose-400 font-semibold mb-1">⚠️ Ən Çox Buraxılan</p>
                  <p className="text-xs text-white/70">{course.mostSkippedLesson}</p>
                </div>
              </div>
              {/* Rating trend */}
              <div>
                <p className="text-xs text-white/40 mb-2">Reytinq Dinamikası</p>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={course.ratingTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[4, 5]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                      <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                      <Line type="monotone" dataKey="avg" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Storefront Section ────────────────────────────────────────────────────────

function StorefrontSection({ data }: { data: StorefrontPerf }) {
  const acceptRate = data.invitesSent > 0 ? Math.round((data.invitesAccepted / data.invitesSent) * 100) : 0
  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
      <h2 className="font-bold">🏫 Storefront Performansı</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Profil baxış', value: data.profileViews.toLocaleString(), color: 'text-indigo-300' },
          { label: 'Dəvət göndərildi', value: data.invitesSent.toString(), color: 'text-white' },
          { label: 'Dəvət qəbul', value: data.invitesAccepted.toString(), color: 'text-emerald-400' },
          { label: 'Qəbul faizi', value: `${acceptRate}%`, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {!data.isFeatured && (
        <div className="flex items-center justify-between p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-indigo-300">Featured müəllim ol</p>
            <p className="text-xs text-white/50 mt-0.5">Ana səhifədə öncül göstərilin, 3× daha çox görünüş qazanın</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors shrink-0 ml-4">
            Featured ol
          </button>
        </div>
      )}
    </div>
  )
}

// ── Impact Breakdown ──────────────────────────────────────────────────────────

function ImpactSection({ data, advice }: { data: ImpactBreakdown[]; advice: string }) {
  const radialData = data.map(d => ({ ...d, fill: d.fill }))
  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-5">
      <h2 className="font-bold">⚡ Impact Score Breakdown</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270} barSize={12}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(255,255,255,0.04)' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map(d => (
            <div key={d.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">{d.name}</span>
                <span className="font-semibold" style={{ color: d.fill }}>{d.value}%</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: d.fill }}
                  initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* AI advice */}
      <div className="flex items-start gap-3 p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl">
        <span className="text-2xl shrink-0">🤖</span>
        <div>
          <p className="text-xs text-indigo-300 font-semibold mb-1">AI Tövsiyəsi</p>
          <p className="text-sm text-white/70 leading-relaxed">{advice}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TeacherAnalytics() {
  const [period, setPeriod] = useState<Period>('month')

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['teacher-analytics', period],
    queryFn: () => api.get<AnalyticsData>(`/teachers/me/analytics?period=${period}`).then(r => r.data).catch(() => MOCK),
  })

  const data = analytics ?? MOCK
  const mergedXP = mergeGroupXP(data.groupXP)

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analitika</h1>
            <p className="text-white/40 text-sm mt-0.5">Tələbə, kurs və storefront göstəriciləri</p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            <button className="px-4 py-2 border border-white/15 hover:border-white/30 rounded-xl text-sm text-white/60 hover:text-white transition-colors">
              📄 Export
            </button>
          </div>
        </div>

        {/* Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.metrics.map((m, i) => <MetricCard key={m.label} metric={m} delay={i * 0.07} />)}
          </div>
        )}

        {/* Group XP trend */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold mb-5">📈 Qrup XP Dinamikası</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedXP} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                {data.groupXP.map(g => (
                  <Line key={g.group} type="monotone" dataKey={g.group} stroke={g.color} strokeWidth={2} dot={{ fill: g.color, r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top students */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold">⭐ Ən Çox İnkişaf Edənlər</h2>
            <div className="space-y-2">
              {data.topStudents.map((s, i) => <StudentRow key={s.id} student={s} rank={i + 1} />)}
            </div>
          </div>

          {/* Weak students */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-bold">⚠️ Diqqət Tələb Edənlər</h2>
            <div className="space-y-2">
              {data.weakStudents.length > 0
                ? data.weakStudents.map(s => <StudentRow key={s.id} student={s} isWeak />)
                : <div className="text-center py-8 text-white/40">🎉 Hamı yaxşı gedir!</div>
              }
            </div>
          </div>
        </div>

        {/* Course analytics */}
        <div>
          <h2 className="font-bold mb-4">📚 Kurs Analitikası</h2>
          <div className="space-y-3">
            {data.courses.map(c => <CourseAnalyticsCard key={c.id} course={c} />)}
          </div>
        </div>

        {/* Storefront */}
        <StorefrontSection data={data.storefront} />

        {/* Impact */}
        <ImpactSection data={data.impactBreakdown} advice={data.aiAdvice} />
      </div>
    </div>
  )
}
