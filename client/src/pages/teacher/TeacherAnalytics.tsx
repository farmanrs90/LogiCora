import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar,
  RadialBarChart, RadialBar, Funnel, FunnelChart, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import api from '../../lib/axios'
import { APP_ROUTES } from '../../constants'
import toast from 'react-hot-toast'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHART_TOOLTIP = { backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#111827', fontSize: 11 }
const AXIS_TICK = { fill: '#94A3B8', fontSize: 11 }
const AXIS_TICK_SM = { fill: '#94A3B8', fontSize: 10 }

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
    <div className="flex gap-1 bg-slate-100 border border-gray-200 rounded-xl p-1">
      {(['week', 'month', 'year'] as Period[]).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${value === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
        >
          {p === 'week' ? 'Bu Həftə' : p === 'month' ? 'Bu Ay' : 'Bu İl'}
        </button>
      ))}
    </div>
  )
}

// ── Metric Card (məlumat kartı — kliklənmir) ────────────────────────────────────

function MetricCard({ metric, delay }: { metric: MetricCard; delay: number }) {
  const isUp = metric.trend >= 0
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
    >
      <p className="text-xs text-gray-500 mb-2">{metric.label}</p>
      <p className="text-3xl font-bold mb-1 text-gray-900">{metric.value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(metric.trend)}%
        </span>
        <span className="text-xs text-gray-400">{metric.sub}</span>
      </div>
    </motion.div>
  )
}

// ── Student Row ───────────────────────────────────────────────────────────────

function StudentRow({ student, rank, isWeak }: { student: StudentProgress; rank?: number; isWeak?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-gray-200 rounded-xl">
      {rank && (
        <span className={`text-sm font-bold w-6 text-center shrink-0 ${rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : rank === 3 ? 'text-amber-700' : 'text-gray-400'}`}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </span>
      )}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {student.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
        <p className="text-xs text-gray-400">{student.lastSeen}</p>
      </div>
      {!isWeak ? (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-600">+{student.xpGain} XP</p>
          <p className="text-xs text-gray-400">+{student.xpGainPct}%</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs text-rose-500">{student.attendancePct}% dərs iştirakı</p>
            <p className="text-xs text-gray-400">{student.lastSeen}</p>
          </div>
          <Link to={APP_ROUTES.CHAT} className="text-xs text-amber-700 border border-amber-200 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors">
            Mesaj
          </Link>
        </div>
      )}
      {/* Real nəticə axını — /results (müəllim tələbə nəticələri) */}
      <Link to={APP_ROUTES.RESULTS} className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
        Nəticələr →
      </Link>
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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <button className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div>
          <p className="font-semibold text-gray-900">{course.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {course.enrollCount.toLocaleString()} qeydiyyat · ⭐ {course.avgRating}
          </p>
        </div>
        <motion.svg animate={{ rotate: expanded ? 180 : 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Funnel */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Tamamlanma Funnel</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <FunnelChart>
                        <Tooltip contentStyle={CHART_TOOLTIP} />
                        <Funnel dataKey="value" data={funnelData} isAnimationActive>
                          <LabelList position="right" fill="#475569" stroke="none" fontSize={11} dataKey="name" />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Weekly enroll */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Həftəlik Qeydiyyat</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={course.weeklyEnroll} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="week" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK_SM} axisLine={false} tickLine={false} width={26} />
                        <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                        <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              {/* Lesson insights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">🎯 Ən Çox Baxılan</p>
                  <p className="text-xs text-gray-600">{course.mostWatchedLesson}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs text-rose-600 font-semibold mb-1">⚠️ Ən Çox Buraxılan</p>
                  <p className="text-xs text-gray-600">{course.mostSkippedLesson}</p>
                </div>
              </div>
              {/* Rating trend */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Reytinq Dinamikası</p>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={course.ratingTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis dataKey="month" tick={AXIS_TICK_SM} axisLine={false} tickLine={false} />
                      <YAxis domain={[4, 5]} tick={AXIS_TICK_SM} axisLine={false} tickLine={false} width={26} />
                      <Tooltip contentStyle={CHART_TOOLTIP} />
                      <Line type="monotone" dataKey="avg" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Real kurs səhifəsinə keçid (yalnız id varsa) */}
              {course.id && (
                <Link
                  to={APP_ROUTES.COURSE(course.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Kursu aç →
                </Link>
              )}
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
      <h2 className="font-bold text-gray-900">🏫 Storefront Performansı</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Profil baxış', value: data.profileViews.toLocaleString(), color: 'text-indigo-600' },
          { label: 'Dəvət göndərildi', value: data.invitesSent.toString(), color: 'text-gray-900' },
          { label: 'Dəvət qəbul', value: data.invitesAccepted.toString(), color: 'text-emerald-600' },
          { label: 'Qəbul faizi', value: `${acceptRate}%`, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {!data.isFeatured && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-indigo-700">Featured müəllim ol</p>
            <p className="text-xs text-gray-500 mt-0.5">Ana səhifədə öncül göstərilin, 3× daha çox görünüş qazanın.</p>
          </div>
          {/* Real backend axını yoxdur → kliklənməyən/disabled, dürüst məlumat */}
          <div className="shrink-0 sm:text-right">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Featured bölməsi post-demo mərhələsində aktivləşdiriləcək."
              className="px-4 py-2 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed"
            >
              Featured ol
            </button>
            <p className="mt-1 text-xs text-gray-400">Featured bölməsi post-demo mərhələsində aktivləşdiriləcək.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Impact Breakdown ──────────────────────────────────────────────────────────

function ImpactSection({ data, advice }: { data: ImpactBreakdown[]; advice: string }) {
  const radialData = data.map(d => ({ ...d, fill: d.fill }))
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
      <h2 className="font-bold text-gray-900">⚡ Impact Score Breakdown</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270} barSize={12}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F1F5F9' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3 w-full">
          {data.map(d => (
            <div key={d.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{d.name}</span>
                <span className="font-semibold" style={{ color: d.fill }}>{d.value}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: d.fill }}
                  initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* AI advice */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <span className="text-2xl shrink-0">💡</span>
        <div>
          <p className="text-xs text-indigo-700 font-semibold mb-1">AI Tövsiyəsi</p>
          <p className="text-sm text-gray-600 leading-relaxed">{advice}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TeacherAnalytics() {
  const [period, setPeriod] = useState<Period>('month')
  const navigate = useNavigate()

  const { data: analytics, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-analytics', period],
    queryFn: () => api.get<AnalyticsData>(`/teachers/me/analytics?period=${period}`).then(r => r.data),
  })

  // Backend 200 amma məzmun yoxdursa — empty state (fake analitika göstərmirik).
  const isEmptyAnalytics = !!analytics
    && !analytics.metrics?.length
    && !analytics.topStudents?.length
    && !analytics.weakStudents?.length
    && !analytics.courses?.length
    && !analytics.groupXP?.length
  const hasData = !!analytics && !isEmptyAnalytics
  const mergedXP = mergeGroupXP(analytics?.groupXP ?? [])

  // Mövcud analitika datasını sadə CSV kimi ixrac edir (yeni backend/endpoint tələb etmir)
  const handleExport = () => {
    if (!analytics) return   // yalnız real data varsa ixrac — saxta CSV yox
    const esc = (v: string | number) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines: string[] = []
    lines.push('LogiCora — Analitika')
    lines.push(`Period,${period}`)
    lines.push('')
    lines.push(['Göstərici', 'Dəyər', 'Trend %', 'Qeyd'].join(','))
    analytics.metrics.forEach((m) => lines.push([m.label, m.value, m.trend, m.sub].map(esc).join(',')))
    lines.push('')
    lines.push(['Ən aktiv tələbə', 'XP artımı', 'Dərs iştirakı %', 'Son görünmə'].join(','))
    analytics.topStudents.forEach((s) => lines.push([s.name, s.xpGain, s.attendancePct, s.lastSeen].map(esc).join(',')))
    lines.push('')
    lines.push(['Dəstək tələb edən tələbə', 'XP artımı', 'Dərs iştirakı %', 'Son görünmə'].join(','))
    analytics.weakStudents.forEach((s) => lines.push([s.name, s.xpGain, s.attendancePct, s.lastSeen].map(esc).join(',')))

    const csv = '﻿' + lines.join('\n')   // BOM — Excel-də Azərbaycan hərfləri düzgün görünsün
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `logicora-analitika-${period}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Analitika CSV kimi yükləndi')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Analitika</h1>
            <p className="text-gray-600 text-sm mt-0.5">Tələbə, kurs və storefront göstəriciləri</p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            <button onClick={handleExport} disabled={!hasData}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white">
              📄 Export
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : isError ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Analitika yüklənmədi</h2>
            <p className="text-gray-500 text-sm mb-6">Zəhmət olmasa yenidən cəhd edin.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => navigate(APP_ROUTES.DASHBOARD.TEACHER)} className="px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-50 transition-colors">Dashboard-a qayıt</button>
              <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">Yenidən yoxla</button>
            </div>
          </div>
        ) : !analytics || isEmptyAnalytics ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2">Hələ analitika məlumatı yoxdur</h2>
            <p className="text-gray-500 text-sm">Tələbə və kurs aktivliyi toplandıqca burada görünəcək.</p>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {analytics.metrics.map((m, i) => <MetricCard key={m.label} metric={m} delay={i * 0.07} />)}
            </div>

            {/* Group XP trend */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-5 text-gray-900">📈 Qrup XP Dinamikası</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergedXP} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
                    {analytics.groupXP.map(g => (
                      <Line key={g.group} type="monotone" dataKey={g.group} stroke={g.color} strokeWidth={2} dot={{ fill: g.color, r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top students */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900">⭐ Ən Çox İnkişaf Edənlər</h2>
                <div className="space-y-2">
                  {analytics.topStudents.map((s, i) => <StudentRow key={s.id} student={s} rank={i + 1} />)}
                </div>
              </div>

              {/* Weak students */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-gray-900">⚠️ Diqqət Tələb Edənlər</h2>
                <div className="space-y-2">
                  {analytics.weakStudents.length > 0
                    ? analytics.weakStudents.map(s => <StudentRow key={s.id} student={s} isWeak />)
                    : <div className="text-center py-8 text-gray-400">🎉 Hamı yaxşı gedir!</div>
                  }
                </div>
              </div>
            </div>

            {/* Course analytics */}
            <div>
              <h2 className="font-bold mb-4 text-gray-900">📚 Kurs Analitikası</h2>
              <div className="space-y-3">
                {analytics.courses.map(c => <CourseAnalyticsCard key={c.id} course={c} />)}
              </div>
            </div>

            {/* Storefront */}
            <StorefrontSection data={analytics.storefront} />

            {/* Impact */}
            <ImpactSection data={analytics.impactBreakdown} advice={analytics.aiAdvice} />
          </>
        )}
      </div>
    </div>
  )
}
