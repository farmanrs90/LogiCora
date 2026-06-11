import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RadialBarChart, RadialBar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year'

interface ChildHeader {
  id: string
  name: string
  avatar?: string
  level: number
  league: string
  ageGroup: string
}

interface ProgressMetrics {
  quizCompletion: number
  attendance: number
  competitionRate: number
  courseProgress: number
}

interface SubjectData {
  subject: string
  level: number
  trend: number
  radarValue: number
  isWeak: boolean
}

interface MoodData {
  date: string
  mood: number
  label: string
}

interface AttendanceDay {
  date: string
  status: 'present' | 'absent' | 'distant' | 'none'
}

interface CompResult {
  title: string
  rank: number
  totalParticipants: number
  score: number
  date: string
}

interface CareerSuggestion {
  icon: string
  title: string
  why: string
  steps: string[]
}

interface FullProgress {
  child: ChildHeader
  metrics: ProgressMetrics
  subjects: SubjectData[]
  mood: MoodData[]
  moodAdvice: string
  attendance: AttendanceDay[]
  attendanceStats: { present: number; absent: number; distant: number }
  competitions: CompResult[]
  avgRank: number
  bestResult: string
  careerSuggestions: CareerSuggestion[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ATTEND_COLOR: Record<string, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-rose-500',
  distant: 'bg-blue-500',
  none: 'bg-white/8',
}

const LEAGUE_EMOJI: Record<string, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '🔷', diamond: '💎',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })
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

// ── Section Wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </div>
  )
}

function ProgressState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-[#141414] border border-white/10 rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm text-white/70">{message}</p>
        {children && <div className="flex flex-col gap-3">{children}</div>}
      </div>
    </div>
  )
}

const safeNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ChildProgress() {
  const { childId } = useParams<{ childId: string }>()
  const [period, setPeriod] = useState<Period>('month')
  const printRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Time capsule state (quick add from here)
  const [capsuleMsg, setCapsuleMsg] = useState('')
  const [capsuleDate, setCapsuleDate] = useState('')

  const { data: progress, isLoading, isError, refetch } = useQuery<FullProgress | null>({
    queryKey: ['child-progress', childId, period],
    queryFn: () =>
      api.get<FullProgress | null>(`/parent/child/${childId}/progress?period=${period}`)
        .then(r => r.data),
    enabled: !!childId,
  })

  const capsuleMutation = useMutation({
    mutationFn: () => api.post('/parent/time-capsule', { childId, message: capsuleMsg, openAt: capsuleDate }),
    onSuccess: () => { setCapsuleMsg(''); setCapsuleDate(''); qc.invalidateQueries({ queryKey: ['time-capsules', childId] }) },
    onError: () => { setCapsuleMsg(''); setCapsuleDate('') },
  })

  const handlePdf = async () => {
    if (!printRef.current || !progress?.child) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(printRef.current, { backgroundColor: '#0D0D0D', scale: 1.2 })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = pdf.internal.pageSize.getWidth()
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width)
    pdf.save(`${progress.child.name ?? 'Uşaq'}_İrəliləyiş_Hesabatı.pdf`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] animate-pulse">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <div className="h-20 bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ProgressState message="İrəliləyiş məlumatları yüklənmədi.">
        <button
          onClick={() => refetch()}
          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-colors"
        >
          Yenidən yoxla
        </button>
        <Link
          to="/dashboard/parent"
          className="w-full px-4 py-2.5 border border-white/15 hover:border-white/30 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
        >
          Valideyn panelinə qayıt
        </Link>
      </ProgressState>
    )
  }

  if (!progress?.child) {
    return (
      <ProgressState message="Bu uşaq üçün irəliləyiş məlumatı hələ formalaşmayıb.">
        <Link
          to="/dashboard/parent"
          className="w-full px-4 py-2.5 border border-white/15 hover:border-white/30 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
        >
          Valideyn panelinə qayıt
        </Link>
      </ProgressState>
    )
  }

  const child = progress.child
  const childName = typeof child.name === 'string' && child.name ? child.name : 'Uşaq'
  const metrics = progress.metrics ?? { quizCompletion: 0, attendance: 0, competitionRate: 0, courseProgress: 0 }
  const subjects = Array.isArray(progress.subjects) ? progress.subjects : []
  const mood = Array.isArray(progress.mood) ? progress.mood : []
  const moodAdvice = typeof progress.moodAdvice === 'string' ? progress.moodAdvice : ''
  const attendance = Array.isArray(progress.attendance) ? progress.attendance : []
  const rawAttendanceStats = progress.attendanceStats ?? { present: 0, absent: 0, distant: 0 }
  const attendanceStats = {
    present: safeNumber(rawAttendanceStats.present),
    absent:  safeNumber(rawAttendanceStats.absent),
    distant: safeNumber(rawAttendanceStats.distant),
  }
  const competitions = Array.isArray(progress.competitions) ? progress.competitions : []
  const careerSuggestions = Array.isArray(progress.careerSuggestions) ? progress.careerSuggestions : []
  const avgRank = safeNumber(progress.avgRank)
  const bestResult = typeof progress.bestResult === 'string' ? progress.bestResult : 'Hələ yarış nəticəsi yoxdur'

  const compChartData = [...competitions].reverse().map(c => {
    const title = typeof c.title === 'string' ? c.title : ''
    return { name: title.slice(0, 10) + '…', xal: safeNumber(c.score), yer: safeNumber(c.rank) }
  })

  const radialData = [
    { name: 'Quiz', value: safeNumber(metrics.quizCompletion), fill: '#6366F1' },
    { name: 'Davamiyyət', value: safeNumber(metrics.attendance), fill: '#8B5CF6' },
    { name: 'Yarış', value: safeNumber(metrics.competitionRate), fill: '#06B6D4' },
    { name: 'Kurs', value: safeNumber(metrics.courseProgress), fill: '#10B981' },
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div ref={printRef} className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard/parent" className="text-white/40 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </Link>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold border-2 border-white/10">
              {child.avatar ? <img src={child.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : childName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{childName}</h1>
                <span className="text-lg">{LEAGUE_EMOJI[child.league]}</span>
              </div>
              <p className="text-sm text-white/50">Səviyyə {safeNumber(child.level)} · Tam irəliləyiş hesabatı</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PeriodSelector value={period} onChange={setPeriod} />
            <button onClick={handlePdf}
              className="flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:border-white/30 rounded-xl text-xs text-white/60 hover:text-white transition-colors"
            >
              📄 PDF Export
            </button>
          </div>
        </div>

        {/* ── Bölmə 1 — Ümumi Metrics RadialBar ─────────────────────── */}
        <Section title="📊 Ümumi İrəliləyiş">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 min-h-[12rem] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="25%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270} barSize={14}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {radialData.map(d => (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{d.name}</span>
                    <span className="font-bold" style={{ color: d.fill }}>{d.value}%</span>
                  </div>
                  <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: d.fill }}
                      initial={{ width: 0 }} animate={{ width: `${d.value}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Bölmə 2 — Fənn Analiz RadarChart ──────────────────────── */}
        <Section title="🕸️ Fənn üzrə Analiz">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-full sm:w-56 h-56 min-h-[14rem] shrink-0">
              {subjects.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={subjects}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <Radar name="Səviyyə" dataKey="radarValue" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-white/40 text-center">
                  Hələ fənn məlumatı yoxdur
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              {subjects.map(s => (
                <div key={s.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.subject}</span>
                      {s.isWeak && <span className="text-xs text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded-full">⚡ Zəif</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${s.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.trend >= 0 ? '↑' : '↓'}{Math.abs(s.trend)}%
                      </span>
                      <span className="text-xs text-white/40 w-8 text-right">{s.level}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: s.isWeak ? '#F59E0B' : s.level >= 70 ? '#10B981' : '#6366F1' }}
                      initial={{ width: 0 }} animate={{ width: `${s.level}%` }} transition={{ duration: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Bölmə 3 — Emosiya Qrafiki ──────────────────────────────── */}
        <Section title="😊 Emosiya Qrafiki">
          <div className="h-40 w-full min-h-[10rem]">
            {mood.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mood} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 18 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 5]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }}
                    formatter={(val: unknown) => { const n = Number(val); return [`${['😡', '😔', '😐', '😊', '🤩'][n - 1] ?? ''} Əhval: ${n}/5`, ''] as [string, string] }}
                  />
                  <Line type="monotone" dataKey="mood" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                Hələ emosiya məlumatı yoxdur
              </div>
            )}
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-950/40 border border-purple-500/20 rounded-xl">
            <span className="text-2xl shrink-0">🌸</span>
            <p className="text-sm text-white/70 leading-relaxed">{moodAdvice}</p>
          </div>
        </Section>

        {/* ── Bölmə 4 — Davamiyyət Calendar ─────────────────────────── */}
        <Section title="📅 Davamiyyət Jurnalı">
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {['B.e', 'Ç.a', 'Çar', 'C.a', 'Cüm', 'Şnb', 'Baz'].map(d => (
              <div key={d} className="text-center text-xs text-white/30 py-1">{d}</div>
            ))}
            {/* Fill leading empty cells to align first day */}
            {Array.from({ length: 5 }).map((_, i) => <div key={`empty-${i}`} />)}
            {attendance.map((day, i) => (
              <div key={i} className="group relative">
                <div className={`aspect-square rounded-lg ${ATTEND_COLOR[day.status]} flex items-center justify-center text-xs text-white/60`}>
                  {i + 1}
                </div>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                  {fmtDate(day.date)}: {day.status === 'present' ? 'Gəldi' : day.status === 'absent' ? 'Gəlmədi' : day.status === 'distant' ? 'Distant' : '—'}
                </div>
              </div>
            ))}
          </div>
          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            {[
              { color: 'bg-emerald-500', label: 'Gəldi', count: attendanceStats.present },
              { color: 'bg-rose-500', label: 'Gəlmədi', count: attendanceStats.absent },
              { color: 'bg-blue-500', label: 'Distant', count: attendanceStats.distant },
            ].map(({ color, label, count }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-white/60">{label}:</span>
                <span className="font-semibold">{count} gün</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Bölmə 5 — Yarış Nəticələri ─────────────────────────────── */}
        <Section title="🏆 Yarış Nəticələri">
          <div className="flex items-center gap-6 text-sm mb-4 flex-wrap">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold text-indigo-300">{avgRank.toFixed(1)}</p>
              <p className="text-xs text-white/40">Ort. yer</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/40 mb-1">Ən yaxşı nəticə</p>
              <p className="font-semibold text-yellow-300">🥇 {bestResult}</p>
            </div>
          </div>
          <div className="h-44 w-full min-h-[11rem]">
            {compChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 11 }} />
                  <Bar dataKey="xal" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                Hələ yarış nəticəsi yoxdur
              </div>
            )}
          </div>
          <div className="space-y-2">
            {competitions.slice(0, 5).map((comp, i) => {
              const rank = safeNumber(comp.rank)
              const title = typeof comp.title === 'string' ? comp.title : ''
              const date = typeof comp.date === 'string' ? comp.date : ''
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/8 rounded-xl">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                    rank === 1 ? 'bg-yellow-400/20' : rank > 0 && rank <= 3 ? 'bg-slate-400/20' : 'bg-white/8'
                  }`}>
                    {rank > 0 && rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    <p className="text-xs text-white/40">{safeNumber(comp.totalParticipants)} iştirakçı · {date ? fmtDate(date) : '—'}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-300 shrink-0">{safeNumber(comp.score)} xal</span>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── Bölmə 6 — Peşə Kompas (AI) ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧭</span>
            <h2 className="font-bold">Peşə Kompas</h2>
            <span className="text-xs bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full">AI</span>
          </div>
          <p className="text-xs text-white/50">Övladınızın profilinə görə tövsiyə olunan sahələr:</p>
          <div className="space-y-4">
            {careerSuggestions.map((career, i) => {
              const steps = Array.isArray(career.steps) ? career.steps : []
              return (
                <motion.div key={career.title ?? i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl shrink-0">{career.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{career.title}</p>
                      <p className="text-xs text-white/50 mt-0.5 mb-3">{career.why}</p>
                      <div className="space-y-1">
                        {steps.map((step, j) => (
                          <div key={j} className="flex items-start gap-2 text-xs text-white/60">
                            <span className="text-indigo-400 shrink-0 mt-0.5">{j + 1}.</span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <div className="flex items-start gap-2 text-xs text-white/40 italic">
            <span className="text-xl shrink-0">🌸</span>
            Cora deyir: "Hər uşaq unikaldır — bu yalnız tövsiyədir. Övladınızın seçimi həmişə önəmlidir."
          </div>
        </div>

        {/* ── Zaman Kapsulu (quick panel) ─────────────────────────────── */}
        <div className="bg-gradient-to-br from-purple-950/50 to-indigo-950/30 border border-purple-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💌</span>
            <h2 className="font-bold">Zaman Kapsulu</h2>
          </div>
          <textarea value={capsuleMsg} onChange={e => setCapsuleMsg(e.target.value)} rows={3}
            placeholder={`Sevgili ${childName}, bu günü xatırlayanda...`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
          />
          <div className="flex gap-3">
            <input type="date" value={capsuleDate} onChange={e => setCapsuleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <button onClick={() => capsuleMsg && capsuleDate && capsuleMutation.mutate()}
              disabled={!capsuleMsg || !capsuleDate || capsuleMutation.isPending}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {capsuleMutation.isPending ? '...' : capsuleMutation.isSuccess ? '✓ Göndərildi' : 'Göndər'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
