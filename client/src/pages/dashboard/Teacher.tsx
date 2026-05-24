import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, LineChart, Line,
  RadialBarChart, RadialBar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { motion } from 'framer-motion'
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

// ── Mocks ─────────────────────────────────────────────────────────────────────

const MOCK_STATS: TeacherStats = {
  totalStudents: 248, newStudentsThisMonth: 34,
  studentTrend: [
    { month: 'Okt', count: 140 }, { month: 'Noy', count: 165 },
    { month: 'Dek', count: 180 }, { month: 'Yan', count: 198 },
    { month: 'Fev', count: 214 }, { month: 'Mar', count: 248 },
  ],
  revenueThisMonth: 840,
  revenueTrend: [
    { month: 'Okt', amount: 520 }, { month: 'Noy', amount: 610 },
    { month: 'Dek', amount: 740 }, { month: 'Yan', amount: 680 },
    { month: 'Fev', amount: 790 }, { month: 'Mar', amount: 840 },
  ],
  impactScore: 94, activeGroups: 5, activeStudentsInGroups: 87, lessonsThisWeek: 8,
}

const MOCK_SCHEDULE: ScheduleLesson[] = [
  { id: 'l1', title: 'Python Əsasları', groupName: '9A Qrupu', groupColor: '#6366F1', startTime: '10:00', endTime: '11:30', classroomId: 'cls1' },
  { id: 'l2', title: 'Django REST API', groupName: '11B Qrupu', groupColor: '#8B5CF6', startTime: '14:00', endTime: '15:30', classroomId: 'cls2' },
  { id: 'l3', title: 'Data Science', groupName: 'Onlayn Qrup', groupColor: '#06B6D4', startTime: '18:00', endTime: '19:30' },
]

const MOCK_STUDENTS: RecentStudent[] = [
  { id: 's1', name: 'Anar Hüseynov', lastSeen: '10 dəq əvvəl', xpChange: 120, isWeak: false },
  { id: 's2', name: 'Leyla Quliyeva', lastSeen: '45 dəq əvvəl', xpChange: 80, isWeak: false },
  { id: 's3', name: 'Tural Rəsulzadə', lastSeen: '3 saat əvvəl', xpChange: 40, isWeak: false },
  { id: 's4', name: 'Nigar Əliyeva', lastSeen: '2 gün əvvəl', xpChange: 0, isWeak: true },
  { id: 's5', name: 'Orxan Məmmədov', lastSeen: '5 gün əvvəl', xpChange: 0, isWeak: true },
]

const MOCK_COURSES: CoursePerf[] = [
  {
    id: 'c1', title: 'Python ilə Proqramlaşdırma',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=200',
    enrollCount: 2840, completionPct: 62,
    weeklyData: [{ week: 'H1', count: 40 }, { week: 'H2', count: 55 }, { week: 'H3', count: 38 }, { week: 'H4', count: 62 }],
  },
  {
    id: 'c2', title: 'Django REST API',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200',
    enrollCount: 1640, completionPct: 48,
    weeklyData: [{ week: 'H1', count: 28 }, { week: 'H2', count: 32 }, { week: 'H3', count: 25 }, { week: 'H4', count: 41 }],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, dataKey, color }: { data: object[]; dataKey: string; color: string }) {
  const id = `spark-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width="100%" height={44}>
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
      className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors"
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
      {sparkData && sparkKey && sparkColor && (
        <Sparkline data={sparkData} dataKey={sparkKey} color={sparkColor} />
      )}
    </motion.div>
  )
}

// ── Impact Gauge ──────────────────────────────────────────────────────────────

function ImpactGauge({ score }: { score: number }) {
  const data = [{ name: 'Impact', value: score, fill: '#6366F1' }]
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-white/50 font-medium">Impact Score</p>
        <span className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">Top 10%</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="65%" outerRadius="100%" data={data} startAngle={220} endAngle={-40} barSize={10}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.05)' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{score}<span className="text-lg text-white/30">/100</span></p>
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
        <p className="text-white/50 text-sm">Bu gün dərs yoxdur</p>
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
            className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl hover:border-white/15 transition-colors"
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
              <button className="shrink-0 text-xs text-amber-400 border border-amber-400/30 px-2 py-1 rounded-lg hover:bg-amber-400/10 transition-colors">
                Mesaj
              </button>
            )}
          </motion.div>
        ))}
        {displayed.length === 0 && (
          <p className="text-center py-6 text-white/40 text-sm">
            {tab === 'weak' ? '🎉 Bütün tələbələr aktivdir!' : 'Aktiv tələbə yoxdur'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Course Performance Card ────────────────────────────────────────────────────

function CoursePerformanceCard({ course }: { course: CoursePerf }) {
  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
      <div className="flex gap-4 p-4">
        <div className="w-20 h-14 rounded-xl overflow-hidden bg-black shrink-0">
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{course.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
            <span>👥 {course.enrollCount.toLocaleString()}</span>
            <span>·</span>
            <span>✅ {course.completionPct}%</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${course.completionPct}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>
      </div>
      <div className="px-4 pb-2">
        <p className="text-xs text-white/30 mb-1">Həftəlik qeydiyyat</p>
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={course.weeklyData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="px-4 pb-4">
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get<TeacherStats>('/teachers/me/stats').then(r => r.data).catch(() => MOCK_STATS),
  })

  const { data: schedule } = useQuery({
    queryKey: ['teacher-schedule-today'],
    queryFn: () => api.get<ScheduleLesson[]>('/teachers/me/schedule/today').then(r => r.data).catch(() => MOCK_SCHEDULE),
  })

  const { data: recentStudents } = useQuery({
    queryKey: ['teacher-recent-students'],
    queryFn: () => api.get<RecentStudent[]>('/teachers/me/students?recent=true').then(r => r.data).catch(() => MOCK_STUDENTS),
  })

  const { data: courses } = useQuery({
    queryKey: ['teacher-courses-perf'],
    queryFn: () => api.get<CoursePerf[]>('/teachers/me/courses/performance').then(r => r.data).catch(() => MOCK_COURSES),
  })

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

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

        {/* Unverified warning */}
        {!isVerified && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-amber-400/10 border border-amber-400/30 rounded-xl"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" className="mt-0.5 shrink-0">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-300">Hesabınız hələ təsdiqlənməyib</p>
              <p className="text-xs text-amber-300/70 mt-0.5">Kurs dərc etmək üçün admin təsdiqini gözləyin. Adətən 1-2 iş günü çəkir.</p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-44 animate-pulse" />
            ))
          ) : stats ? (
            <>
              <StatCard title="Ümumi Tələbələr" main={stats.totalStudents.toLocaleString()} sub="ümumi"
                trend={`+${stats.newStudentsThisMonth} bu ay`} sparkData={stats.studentTrend} sparkKey="count" sparkColor="#6366F1" />
              <StatCard title="Bu Ay Gəlir" main={`${stats.revenueThisMonth} ₼`} sub="gəlir" badge="Tezliklə"
                sparkData={stats.revenueTrend} sparkKey="amount" sparkColor="#F59E0B" />
              <ImpactGauge score={stats.impactScore} />
              <StatCard title="Aktiv Qruplar" main={stats.activeGroups.toString()}
                sub={`${stats.activeStudentsInGroups} tələbə`} trend={`${stats.lessonsThisWeek} dərs bu həftə`} />
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
              <TodaySchedule lessons={schedule ?? []} />
            </div>

            {/* Course performance */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">📊 Kurs Performansı</h2>
                <Link to="/courses/create"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
                >
                  + Yeni Kurs
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(courses ?? MOCK_COURSES).map(c => <CoursePerformanceCard key={c.id} course={c} />)}
              </div>
            </div>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">👥 Son Aktivlik</h2>
                <Link to="/groups" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Hamısı →</Link>
              </div>
              <RecentStudents students={recentStudents ?? MOCK_STUDENTS} />
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
