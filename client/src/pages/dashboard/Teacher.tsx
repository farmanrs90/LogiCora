import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, LineChart, Line,
  RadialBarChart, RadialBar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/axios'
import { useAuth } from '../../context/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherStats {
  totalStudents: number
  newStudentsThisMonth: number
  studentTrend: { month: string; count: number }[]
  revenueThisMonth: number
  revenueTrend: { month: string; amount: number }[]
  impactScore: number
  rating: number
  activeGroups: number
  activeStudentsInGroups: number
  lessonsThisWeek: number
}

interface ScheduleLesson {
  id: string
  title: string
  groupName: string
  groupColor: string
  startTime: string
  endTime: string
  classroomId?: string
}

interface RecentStudent {
  id: string
  name: string
  avatar?: string
  lastSeen: string
  xpChange: number
  isWeak: boolean
}

interface CoursePerf {
  id: string
  title: string
  thumbnail: string
  enrollCount: number
  completionPct: number
  weeklyData: { week: string; count: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function ChartFrame({
  className,
  children,
  fallback = null,
}: {
  className: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize((current) => (
        current.width === width && current.height === height
          ? current
          : { width, height }
      ))
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      const timer = window.setTimeout(updateSize, 0)
      return () => window.clearTimeout(timer)
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 ? children : fallback}
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, dataKey, color }: { data: object[]; dataKey: string; color: string }) {
  const id = `spark-${color.replace('#', '')}`
  return (
    <ChartFrame className="w-full min-w-0 h-11 min-h-[44px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={44}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, main, sub, trend, sparkData, sparkKey, sparkColor, badge,
}: {
  title: string; main: string; sub: string; trend?: string
  sparkData?: object[]; sparkKey?: string; sparkColor?: string; badge?: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-white/50 font-medium">{title}</p>
        {badge && <span className="text-xs bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{main}</p>
        <div className="flex items-center gap-2 mt-1">
          {trend && <span className="text-xs text-emerald-400 font-medium">{trend}</span>}
          <span className="text-xs text-white/40">{sub}</span>
        </div>
      </div>
      {sparkData && sparkData.length > 0 && sparkKey && sparkColor && (
        <Sparkline data={sparkData} dataKey={sparkKey} color={sparkColor} />
      )}
    </motion.div>
  )
}

// ── Impact Gauge ──────────────────────────────────────────────────────────────

function ImpactGauge({ score }: { score?: number | null }) {
  const hasScore = typeof score === 'number' && Number.isFinite(score)
  const chartValue = hasScore ? Math.max(0, Math.min(100, score)) : 0
  const data = hasScore ? [{ name: 'Impact', value: chartValue, fill: '#6366F1' }] : []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-white/50 font-medium">Impact Score</p>
      </div>
      <div className="flex items-center gap-4">
        <ChartFrame
          className="w-24 min-w-[96px] h-24 min-h-[96px] shrink-0"
          fallback={<div className="w-full h-full rounded-full border border-white/10 bg-white/[0.03]" />}
        >
          {hasScore ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={96}>
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={data} startAngle={220} endAngle={-40} barSize={10}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.05)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40 text-sm">
              —
            </div>
          )}
        </ChartFrame>
        <div>
          <p className="text-3xl font-bold text-white">{hasScore ? score : '—'}<span className="text-lg text-white/30">/100</span></p>
          <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-[140px]">
            Tələbələrinin ortalama irəliləyişinə görə hesablanır
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Today Schedule ────────────────────────────────────────────────────────────

function TodaySchedule({ lessons }: { lessons: ScheduleLesson[] }) {
  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="text-5xl">📅</div>
        <p className="text-white/50 text-sm">Bu gün dərs yoxdur.</p>
        <Link to="/groups" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Yeni dərs planla →
        </Link>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {lessons.map((lesson, i) => (
        <motion.div key={lesson.id}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
          className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
        >
          <div className="flex flex-col items-center gap-1 shrink-0 w-12">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: lesson.groupColor }} />
            <span className="text-xs text-white/50 font-mono">{lesson.startTime}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">{lesson.title}</p>
            <p className="text-xs mt-0.5" style={{ color: lesson.groupColor }}>{lesson.groupName}</p>
            <p className="text-xs text-white/30">{lesson.startTime} – {lesson.endTime}</p>
          </div>
          {lesson.classroomId && (
            <Link to={`/classroom/${lesson.classroomId}`}
              className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
            >
              Başlat →
            </Link>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ── Recent Students ────────────────────────────────────────────────────────────

function RecentStudents({ students }: { students: RecentStudent[] }) {
  const [tab, setTab] = useState<'active' | 'weak'>('active')
  const displayed = tab === 'active' ? students.filter(s => !s.isWeak) : students.filter(s => s.isWeak)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['active', 'weak'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {t === 'active' ? '✅ Aktiv' : '⚠️ Zəif'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {displayed.map((s, i) => (
          <motion.div key={s.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              {s.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-white/40">{s.lastSeen}</p>
            </div>
            {tab === 'active' && s.xpChange > 0 && (
              <span className="text-xs text-emerald-400 font-semibold shrink-0">+{s.xpChange} XP</span>
            )}
            {tab === 'weak' && (
              <Link to="/chat" className="shrink-0 text-xs text-amber-400 border border-amber-400/30 px-2 py-1 rounded-lg hover:bg-amber-400/10 transition-colors">
                Mesaj
              </Link>
            )}
          </motion.div>
        ))}
        {displayed.length === 0 && (
          <p className="text-center py-6 text-white/40 text-sm">
            {tab === 'weak' ? '🎉 Bütün tələbələr aktivdir!' : 'Hələ tələbə yoxdur.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Course Performance Card ────────────────────────────────────────────────────

function CoursePerformanceCard({ course }: { course: CoursePerf }) {
  const weeklyData = Array.isArray(course.weeklyData) ? course.weeklyData : []

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
      <div className="flex gap-4 p-4">
        <div className="w-20 h-14 rounded-xl overflow-hidden bg-black shrink-0">
          {course.thumbnail
            ? <img src={course.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{course.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
            <span>👥 {course.enrollCount.toLocaleString()}</span>
            {course.completionPct > 0 && (
              <>
                <span>·</span>
                <span>✅ {course.completionPct}%</span>
              </>
            )}
          </div>
          {course.completionPct > 0 && (
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }} animate={{ width: `${course.completionPct}%` }} transition={{ duration: 0.8 }} />
            </div>
          )}
        </div>
      </div>
      {weeklyData.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-white/30 mb-1">Həftəlik qeydiyyat</p>
          <ChartFrame className="w-full min-w-0 h-10 min-h-[40px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={40}>
              <LineChart data={weeklyData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      )}
      <div className="px-4 pb-4 pt-2">
        <Link to={`/courses/${course.id}`}
          className="block w-full py-1.5 text-center text-xs border border-white/10 hover:border-white/20 rounded-lg text-white/60 hover:text-white transition-colors"
        >
          Kursu düzənlə
        </Link>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const { user } = useAuth()
  const isVerified = (user as { isVerified?: boolean } | null)?.isVerified ?? true

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/teachers/me/stats').then(r => r.data.data as TeacherStats),
  })

  const { data: schedule, isLoading: scheduleLoading, isError: scheduleError } = useQuery({
    queryKey: ['teacher-schedule-today'],
    queryFn: () => api.get('/teachers/me/schedule/today').then(r => r.data.data as ScheduleLesson[]),
  })

  const { data: recentStudents, isLoading: studentsLoading, isError: studentsError } = useQuery({
    queryKey: ['teacher-recent-students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data as RecentStudent[]),
  })

  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useQuery({
    queryKey: ['teacher-courses-perf'],
    queryFn: () => api.get('/teachers/me/courses/performance').then(r => r.data.data as CoursePerf[]),
  })

  useEffect(() => {
    if (statsError) toast.error('Statistika yüklənmədi')
  }, [statsError])

  const courseList = courses ?? []

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Salam, {user?.name?.split(' ')[0] ?? 'Müəllim'}!
              </span>{' '}👋
            </h1>
            <p className="text-white/40 text-sm mt-0.5 capitalize">{todayStr()}</p>
          </div>
          <div className="flex items-center gap-3">
            {isVerified && (
              <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Verified Müəllim
              </span>
            )}
            <Link to="/analytics" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-sm transition-colors">
              📊 Analitika
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-44 animate-pulse" />
            ))
          ) : statsError ? (
            <div className="col-span-full bg-[#141414] border border-white/10 rounded-2xl py-10 px-5 text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-white/60 text-sm">Müəllim statistikası yüklənmədi.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => refetchStats()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors">
                  Yenidən yoxla
                </button>
                <button onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium transition-colors">
                  Dashboard-u yenilə
                </button>
              </div>
            </div>
          ) : stats ? (
            <>
              <StatCard title="Ümumi Tələbələr" main={stats.totalStudents.toLocaleString()} sub="ümumi"
                trend={stats.newStudentsThisMonth > 0 ? `+${stats.newStudentsThisMonth} bu ay` : undefined}
                sparkData={stats.studentTrend} sparkKey="count" sparkColor="#6366F1" />
              <StatCard title="Bu Ay Gəlir" main={`${stats.revenueThisMonth} ₼`} sub="gəlir" badge="Tezliklə"
                sparkData={stats.revenueTrend} sparkKey="amount" sparkColor="#F59E0B" />
              <ImpactGauge score={stats.impactScore} />
              <StatCard title="Aktiv Qruplar" main={stats.activeGroups.toString()}
                sub={`${stats.activeStudentsInGroups} tələbə`}
                trend={stats.lessonsThisWeek > 0 ? `${stats.lessonsThisWeek} dərs bu həftə` : undefined} />
            </>
          ) : null}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today schedule */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">📅 Bugünkü Cədvəl</h2>
                <Link to="/groups" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Bütün cədvəl →</Link>
              </div>
              {scheduleLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : scheduleError ? (
                <p className="text-center py-8 text-white/40 text-sm">Bugünkü cədvəl yüklənmədi.</p>
              ) : (
                <TodaySchedule lessons={schedule ?? []} />
              )}
            </div>

            {/* Course performance */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">📊 Kurs Performansı</h2>
                <Link to="/courses"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
                >
                  + Yeni Kurs
                </Link>
              </div>
              {coursesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-40 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : coursesError ? (
                <div className="bg-[#141414] border border-white/10 rounded-2xl py-10 text-center text-white/40 text-sm">
                  Kurs performansı yüklənmədi.
                </div>
              ) : courseList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courseList.map(c => <CoursePerformanceCard key={c.id} course={c} />)}
                </div>
              ) : (
                <div className="bg-[#141414] border border-white/10 rounded-2xl py-10 text-center text-white/40 text-sm">
                  Hələ kurs məlumatı yoxdur. <Link to="/courses" className="text-indigo-400 hover:text-indigo-300">İlk kursunuzu yaradın →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">👥 Son Aktivlik</h2>
                <Link to="/groups" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Hamısı →</Link>
              </div>
              {studentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : studentsError ? (
                <p className="text-center py-8 text-white/40 text-sm">Tələbə aktivliyi yüklənmədi.</p>
              ) : (
                <RecentStudents students={recentStudents ?? []} />
              )}
            </div>

            {/* Quick links */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-2">
              <h2 className="font-bold mb-3">Sürətli Keçidlər</h2>
              {[
                { icon: '👥', label: 'Qrup idarəetməsi', to: '/groups' },
                { icon: '📊', label: 'Analitika', to: '/analytics' },
                { icon: '🏆', label: 'Yarış yarat', to: '/competition/create' },
                { icon: '🏫', label: 'Storefront', to: `/teachers/me` },
              ].map(({ icon, label, to }) => (
                <Link key={to} to={to}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-colors"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-white/30">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
