import { useState, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'

// ── Types (backend /results şəkli ilə eyni) ─────────────────────────────────

interface ResultsGamification {
  totalXP: number
  level: number
  streak: number
  leagueTier: string
  badges: string[]
}
interface DailyRecent {
  id: string
  questionText: string | null
  subject: string | null
  isCorrect: boolean
  xpEarned: number
  date: string | null
  answeredAt?: string | null
}
interface ResultsDailyQuiz {
  totalAnswered: number
  correctAnswers: number
  accuracy: number
  recent: DailyRecent[]
}
interface ResultsCompetition {
  id: string
  title: string
  finishedAt?: string | null
  score: number
  rank: number
  correctAnswers: number
  totalAnswers: number
}
interface ResultsCourse {
  id: string
  courseTitle: string | null
  progress: number
  status: string
  completedAt?: string | null
}
interface StudentResults {
  student?: { id: string; name?: string }
  gamification: ResultsGamification | null
  dailyQuiz: ResultsDailyQuiz
  competitions: ResultsCompetition[]
  courses: ResultsCourse[]
}
interface TeacherStudentSummary {
  studentId: string
  name: string
  email: string | null
  totalXP: number
  level: number
  quizAnswered: number
  quizAccuracy: number
}
interface ParentChildLite { id: string; name: string }

const LEAGUE_LABELS: Record<string, string> = {
  bronze: 'Bürünc', silver: 'Gümüş', gold: 'Qızıl', platinum: 'Platin', diamond: 'Almaz',
}
const COURSE_STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv', pending_payment: 'Ödəniş gözləyir',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Shared UI ───────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <div className="py-8 text-center text-sm text-gray-400">{label}</div>
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// Tək tələbənin tam nəticə görünüşü — student/teacher-detail/parent-child eyni şəkli istifadə edir.
function StudentResultsView({ data }: { data: StudentResults }) {
  const g = data.gamification
  return (
    <div className="space-y-5">
      {/* Gamification summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ümumi XP" value={g ? g.totalXP.toLocaleString('az-AZ') : 0} accent="text-indigo-600" />
        <StatCard label="Səviyyə" value={g ? g.level : 1} accent="text-gray-900" />
        <StatCard label="Seriya" value={`${g ? g.streak : 0} gün`} accent="text-amber-600" />
        <StatCard label="Liqa" value={g ? (LEAGUE_LABELS[g.leagueTier] ?? g.leagueTier) : '—'} accent="text-emerald-600" />
      </div>
      {g && g.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {g.badges.slice(0, 12).map((b, i) => (
            <span key={`${b}-${i}`} className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">🏅 {b}</span>
          ))}
        </div>
      )}

      {/* Daily quiz */}
      <SectionCard title="📝 Günlük Quiz">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">{data.dailyQuiz.totalAnswered}</p><p className="text-[11px] text-gray-500">cavablanıb</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{data.dailyQuiz.correctAnswers}</p><p className="text-[11px] text-gray-500">düz</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-indigo-600">{data.dailyQuiz.accuracy}%</p><p className="text-[11px] text-gray-500">dəqiqlik</p></div>
        </div>
        {data.dailyQuiz.totalAnswered === 0 ? (
          <EmptyRow label="Hələ quiz cavabı yoxdur." />
        ) : data.dailyQuiz.recent.length > 0 ? (
          <>
            <p className="text-[11px] text-gray-400 mb-2">Son cavablar</p>
            <ul className="divide-y divide-gray-100">
              {data.dailyQuiz.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${r.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.isCorrect ? '✓' : '✕'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate">{r.questionText ?? 'Sual'}</p>
                    <p className="text-[11px] text-gray-400">{r.subject ?? '—'} · {fmtDate(r.date ?? r.answeredAt)}</p>
                  </div>
                  {r.xpEarned > 0 && <span className="shrink-0 text-[11px] text-emerald-600 font-semibold">+{r.xpEarned} XP</span>}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-3">Tam sual-sual tarixçə post-demo mərhələsində genişləndiriləcək.</p>
          </>
        ) : null}
      </SectionCard>

      {/* Competitions */}
      <SectionCard title="🏆 Yarış nəticələri">
        {data.competitions.length === 0 ? (
          <EmptyRow label="Hələ tamamlanmış yarış nəticəsi yoxdur." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.competitions.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <p className="text-[11px] text-gray-400">{c.correctAnswers}/{c.totalAnswers} düz · {fmtDate(c.finishedAt)}</p>
                </div>
                {c.rank > 0 && <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">#{c.rank}</span>}
                <span className="shrink-0 text-sm font-bold text-gray-900 w-16 text-right">{c.score.toLocaleString('az-AZ')}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Courses */}
      <SectionCard title="📚 Kurs irəliləyişi">
        {data.courses.length === 0 ? (
          <EmptyRow label="Hələ kurs qeydiyyatı yoxdur." />
        ) : (
          <ul className="space-y-3">
            {data.courses.map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.courseTitle ?? 'Kurs'}</p>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${c.status === 'pending_payment' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {COURSE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{c.progress}% tamamlanıb{c.completedAt ? ` · ${fmtDate(c.completedAt)}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white border border-gray-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-white border border-gray-200 rounded-2xl animate-pulse" />
    </div>
  )
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-sm text-gray-600">Nəticələr yüklənmədi.</p>
      <button onClick={onRetry} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Yenidən yoxla</button>
    </div>
  )
}

// ── Student mode ──────────────────────────────────────────────────────────────

function StudentResultsPanel() {
  const { data, isLoading, isError, refetch } = useQuery<StudentResults>({
    queryKey: ['results', 'me'],
    queryFn: () => api.get<{ data: StudentResults }>(API_ROUTES.RESULTS.ME).then(r => r.data.data),
  })
  return (
    <>
      <Header title="Nəticələrim" subtitle="Quiz, yarış, kurs və inkişaf tarixçəni bir yerdə izlə." />
      {isLoading ? <LoadingBlock /> : isError || !data ? <ErrorBlock onRetry={() => refetch()} /> : <StudentResultsView data={data} />}
    </>
  )
}

// ── Teacher mode ──────────────────────────────────────────────────────────────

function TeacherResults() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<{ students: TeacherStudentSummary[] }>({
    queryKey: ['results', 'teacher'],
    queryFn: () => api.get<{ data: { students: TeacherStudentSummary[] } }>(API_ROUTES.RESULTS.TEACHER).then(r => r.data.data),
  })

  const detail = useQuery<StudentResults>({
    queryKey: ['results', 'student', selectedId],
    queryFn: () => api.get<{ data: StudentResults }>(API_ROUTES.RESULTS.STUDENT(selectedId!)).then(r => r.data.data),
    enabled: !!selectedId,
  })

  return (
    <>
      <Header title="Tələbə nəticələri" subtitle="Qruplarındakı tələbələrin quiz, yarış və kurs irəliləyişini izlə." />
      {isLoading ? <LoadingBlock /> : isError || !data ? <ErrorBlock onRetry={() => refetch()} /> : data.students.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm text-sm text-gray-400">
          Qruplarınızda hələ tələbə yoxdur. Qrup və tələbə əlavə etdikdən sonra nəticələr burada görünəcək.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Student list */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-900 text-sm">Tələbələr ({data.students.length})</h2></div>
            <ul className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {data.students.map((s) => (
                <li key={s.studentId}>
                  <button onClick={() => setSelectedId(s.studentId)}
                    className={`w-full text-left p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 ${selectedId === s.studentId ? 'bg-indigo-50' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <span className="shrink-0 text-[11px] text-indigo-600 font-semibold">{s.totalXP.toLocaleString('az-AZ')} XP</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Səviyyə {s.level} · {s.quizAnswered} quiz · {s.quizAccuracy}% dəqiqlik</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Selected student detail */}
          <div className="lg:col-span-2">
            {!selectedId ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm text-sm text-gray-400">
                Detallı nəticələr üçün soldan tələbə seçin.
              </div>
            ) : detail.isLoading ? <LoadingBlock /> : detail.isError || !detail.data ? <ErrorBlock onRetry={() => detail.refetch()} /> : (
              <StudentResultsView data={detail.data} />
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Parent mode ───────────────────────────────────────────────────────────────

function ParentResults() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: children, isLoading, isError, refetch } = useQuery<ParentChildLite[]>({
    queryKey: ['children'],
    queryFn: () => api.get<ParentChildLite[]>('/parent/children').then(r => r.data),
  })

  useEffect(() => {
    if (children && children.length > 0 && !selectedId) setSelectedId(children[0].id)
  }, [children, selectedId])

  const detail = useQuery<StudentResults>({
    queryKey: ['results', 'child', selectedId],
    queryFn: () => api.get<{ data: StudentResults }>(API_ROUTES.RESULTS.PARENT_CHILD(selectedId!)).then(r => r.data.data),
    enabled: !!selectedId,
  })

  return (
    <>
      <Header title="Övlad nəticələri" subtitle="Övladının quiz, yarış və kurs irəliləyişini real məlumatlarla izlə." />
      {isLoading ? <LoadingBlock /> : isError ? <ErrorBlock onRetry={() => refetch()} /> : !children || children.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
          <p className="text-sm text-gray-400">Hələ övlad əlavə edilməyib.</p>
          <Link to={APP_ROUTES.DASHBOARD.PARENT} className="inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium">Valideyn panelinə keç →</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map((c) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${selectedId === c.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{c.name[0]}</span>
                  <span className="text-sm font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedId ? null : detail.isLoading ? <LoadingBlock /> : detail.isError || !detail.data ? <ErrorBlock onRetry={() => detail.refetch()} /> : (
            <StudentResultsView data={detail.data} />
          )}
        </div>
      )}
    </>
  )
}

// ── Header + Main ─────────────────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
    </div>
  )
}

export default function Results() {
  const { user } = useAuth()
  const role = user?.role

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {role === 'student' && <StudentResultsPanel />}
        {role === 'teacher' && <TeacherResults />}
        {role === 'parent' && <ParentResults />}
        {(role === 'admin' || role === 'manager') && (
          <>
            <Header title="Nəticələr" subtitle="Platforma nəticələri." />
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
              <div className="text-4xl">📊</div>
              <p className="text-sm text-gray-600">Admin geniş nəticə analitikası post-demo mərhələsində genişləndiriləcək.</p>
              <Link to={APP_ROUTES.ADMIN} className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
                Admin panelinə keç
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
