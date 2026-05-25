import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import toast from 'react-hot-toast'

import api from '../../lib/api'
import { API_ROUTES, APP_ROUTES } from '../../constants'
import { useSocket } from '../../hooks/useSocket'
import type { RootState } from '../../app/store'
import Spinner from '../../components/Spinner'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClassroomData {
  _id:        string
  title:      string
  subject:    string
  teacherId:  string
  teacherName: string
  teacherAvatar: string
  classGroup: string
  startedAt:  string
  status:     'active' | 'ended'
  isRecording: boolean
  recordingUrl?: string
  pin:        string
  qrToken:    string
  qrExpiresAt: string
}

interface AttendanceRecord {
  studentId:   string
  name:        string
  avatarColor: string
  status:      'present' | 'absent' | 'waiting' | 'distant'
  joinedAt:    string | null
  isDistant:   boolean
}

interface LiveQuiz {
  _id:           string
  text:          string
  options:       string[]
  correctIndex:  number
  results:       number[]
  totalAnswered: number
  isActive:      boolean
}

interface PollData {
  _id:      string
  question: string
  options:  string[]
  results:  number[]
  isAnon:   boolean
  isActive: boolean
}

interface OnlineStudent {
  studentId:  string
  name:       string
  avatarColor: string
  handRaised: boolean
  isDistant:  boolean
  lastSeen:   string
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CLASSROOM: ClassroomData = {
  _id: 'cr-1', title: 'Riyaziyyat — Cəbr', subject: 'Riyaziyyat',
  teacherId: 'teacher-1', teacherName: 'Əli müəllim', teacherAvatar: '#3B82F6',
  classGroup: '9-A', startedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  status: 'active', isRecording: false,
  pin: '4821', qrToken: 'tok_abc123',
  qrExpiresAt: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
}

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { studentId: 'u1', name: 'Aytən M.',  avatarColor: '#9333EA', status: 'present',  joinedAt: new Date(Date.now() - 1000*60*16).toISOString(), isDistant: false },
  { studentId: 'u2', name: 'Kənan H.',  avatarColor: '#3B82F6', status: 'present',  joinedAt: new Date(Date.now() - 1000*60*15).toISOString(), isDistant: false },
  { studentId: 'u3', name: 'Nigar Ə.',  avatarColor: '#06B6D4', status: 'distant',  joinedAt: new Date(Date.now() - 1000*60*14).toISOString(), isDistant: true  },
  { studentId: 'u4', name: 'Orxan T.',  avatarColor: '#F97316', status: 'waiting',  joinedAt: null, isDistant: false },
  { studentId: 'u5', name: 'Leyla K.',  avatarColor: '#EC4899', status: 'present',  joinedAt: new Date(Date.now() - 1000*60*12).toISOString(), isDistant: false },
  { studentId: 'u6', name: 'Rauf N.',   avatarColor: '#22C55E', status: 'absent',   joinedAt: null, isDistant: false },
  { studentId: 'u7', name: 'Günel A.',  avatarColor: '#EAB308', status: 'present',  joinedAt: new Date(Date.now() - 1000*60*10).toISOString(), isDistant: false },
  { studentId: 'u8', name: 'Fərid M.',  avatarColor: '#8B5CF6', status: 'distant',  joinedAt: new Date(Date.now() - 1000*60*9).toISOString(),  isDistant: true  },
]

const MOCK_ONLINE: OnlineStudent[] = [
  { studentId: 'u1', name: 'Aytən M.',  avatarColor: '#9333EA', handRaised: false, isDistant: false, lastSeen: new Date().toISOString() },
  { studentId: 'u2', name: 'Kənan H.',  avatarColor: '#3B82F6', handRaised: true,  isDistant: false, lastSeen: new Date().toISOString() },
  { studentId: 'u3', name: 'Nigar Ə.',  avatarColor: '#06B6D4', handRaised: false, isDistant: true,  lastSeen: new Date().toISOString() },
  { studentId: 'u5', name: 'Leyla K.',  avatarColor: '#EC4899', handRaised: false, isDistant: false, lastSeen: new Date().toISOString() },
  { studentId: 'u7', name: 'Günel A.',  avatarColor: '#EAB308', handRaised: true,  isDistant: false, lastSeen: new Date().toISOString() },
  { studentId: 'u8', name: 'Fərid M.',  avatarColor: '#8B5CF6', handRaised: false, isDistant: true,  lastSeen: new Date().toISOString() },
]

const QUIZ_COLORS = ['#9333EA', '#3B82F6', '#22C55E', '#F97316']

// ── Utilities ──────────────────────────────────────────────────────────────

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const m    = Math.floor(diff / 60)
  const s    = diff % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Mock QR Code visual ────────────────────────────────────────────────────
// Draws a pixel-art QR-like pattern using CSS — no external lib required

function QRCodeVisual({ token, size = 200 }: { token: string; size?: number }) {
  // Deterministic pixel grid from token chars
  const pixels: boolean[][] = Array.from({ length: 21 }, (_, row) =>
    Array.from({ length: 21 }, (_, col) => {
      // Corners (finder patterns)
      if ((row < 7 && col < 7) || (row < 7 && col > 13) || (row > 13 && col < 7)) {
        const isOuterRing = row === 0 || row === 6 || col === 0 || col === 6
        const isInnerDot  = row >= 2 && row <= 4 && col >= 2 && col <= 4
        if ((row < 7 && col < 7)) return isOuterRing || isInnerDot
        if ((row < 7 && col > 13)) {
          const c = col - 14
          return (row === 0 || row === 6 || c === 0 || c === 6) || (row >= 2 && row <= 4 && c >= 2 && c <= 4)
        }
        if ((row > 13 && col < 7)) {
          const r = row - 14
          return (r === 0 || r === 6 || col === 0 || col === 6) || (r >= 2 && r <= 4 && col >= 2 && col <= 4)
        }
      }
      // Data modules — pseudo-random from token
      const code = token.charCodeAt((row * 21 + col) % token.length)
      return ((code ^ (row * 7 + col * 13)) % 2) === 0
    })
  )

  const cell = size / 21

  return (
    <div
      className="rounded-2xl p-3 bg-white"
      style={{ width: size + 24, height: size + 24, display: 'inline-block' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {pixels.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="#0D0D0D"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AttendanceRecord['status'] }) {
  const map = {
    present:  { icon: '✅', label: 'Gəldi',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    absent:   { icon: '❌', label: 'Gəlmədi',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    waiting:  { icon: '🕐', label: 'Gözlənilir', color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
    distant:  { icon: '💻', label: 'Online',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  }
  const s = map[status]
  return (
    <span
      className="text-xs font-bold px-2 py-1 rounded-lg"
      style={{ color: s.color, background: s.bg }}
    >
      {s.icon} {s.label}
    </span>
  )
}

// ── Quiz builder modal ─────────────────────────────────────────────────────

function QuizBuilderModal({ onClose, onSend }: {
  onClose: () => void
  onSend:  (q: { text: string; options: string[]; correctIndex: number }) => void
}) {
  const [text,         setText]         = useState('')
  const [options,      setOptions]      = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)

  const valid = text.trim().length > 3 && options.every(o => o.trim().length > 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-md rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-black text-xl mb-4">📝 Sual Yarat</h2>

        <label className="text-[#9CA3AF] text-xs mb-1 block">Sual mətni</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Sualı daxil et..."
          rows={2}
          className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none mb-4 resize-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />

        <label className="text-[#9CA3AF] text-xs mb-2 block">Cavab seçimləri — düzgün olanı seç ✓</label>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setCorrectIndex(i)}
              className="w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center"
              style={{
                borderColor: correctIndex === i ? '#22C55E' : 'rgba(255,255,255,0.2)',
                background:  correctIndex === i ? '#22C55E' : 'transparent',
              }}
            >
              {correctIndex === i && <span className="text-white text-xs font-black">✓</span>}
            </button>
            <div
              className="flex-1 h-1.5 w-1.5 rounded-full"
              style={{ background: QUIZ_COLORS[i], minWidth: 12 }}
            />
            <input
              value={opt}
              onChange={e => {
                const next = [...options]
                next[i] = e.target.value
                setOptions(next)
              }}
              placeholder={`Seçim ${String.fromCharCode(65 + i)}`}
              className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${QUIZ_COLORS[i]}30` }}
            />
          </div>
        ))}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10"
          >
            Ləğv et
          </button>
          <motion.button
            onClick={() => valid && onSend({ text, options, correctIndex })}
            disabled={!valid}
            whileHover={valid ? { scale: 1.02 } : {}}
            whileTap={valid ? { scale: 0.97 } : {}}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
          >
            📡 Göndər
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Poll builder modal ─────────────────────────────────────────────────────

function PollBuilderModal({ onClose, onSend }: {
  onClose: () => void
  onSend:  (p: { question: string; options: string[]; isAnon: boolean }) => void
}) {
  const QUICK_POLLS = [
    { question: 'Anladınızmı?', options: ['👍 Bəli', '👎 Xeyr', '🤔 Qismən'] },
    { question: 'Dərs sürəti necədir?', options: ['🐢 Yavaş', '✅ Normal', '🚀 Sürətli'] },
  ]
  const [question, setQuestion] = useState('')
  const [options,  setOptions]  = useState(['', '', ''])
  const [isAnon,   setIsAnon]   = useState(false)
  const [mode,     setMode]     = useState<'quick' | 'custom'>('quick')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-black text-xl mb-4">📊 Sorğu Yarat</h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          {(['quick', 'custom'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: mode === m ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
                border:     `1px solid ${mode === m ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color:      mode === m ? '#C084FC' : '#9CA3AF',
              }}
            >
              {m === 'quick' ? '⚡ Tez' : '✏️ Özel'}
            </button>
          ))}
        </div>

        {mode === 'quick' ? (
          <div className="space-y-3">
            {QUICK_POLLS.map(qp => (
              <motion.button
                key={qp.question}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSend({ question: qp.question, options: qp.options, isAnon })}
                className="w-full p-4 rounded-2xl text-left"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <p className="text-white font-bold text-sm">{qp.question}</p>
                <p className="text-[#9CA3AF] text-xs mt-1">{qp.options.join(' · ')}</p>
              </motion.button>
            ))}
          </div>
        ) : (
          <>
            <label className="text-[#9CA3AF] text-xs mb-1 block">Sual</label>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Sualı daxil et..."
              className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <label className="text-[#9CA3AF] text-xs mb-2 block">Seçimlər (max 4)</label>
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                placeholder={`Seçim ${i + 1}`}
                className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none mb-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            ))}
            <motion.button
              onClick={() => question.trim() && onSend({ question, options: options.filter(o => o.trim()), isAnon })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white mt-3"
              style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
            >
              📡 Göndər
            </motion.button>
          </>
        )}

        {/* Anon toggle */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
          <span className="text-[#9CA3AF] text-sm">Anonim rejim</span>
          <button
            onClick={() => setIsAnon(p => !p)}
            className="w-12 h-6 rounded-full transition-all relative"
            style={{ background: isAnon ? '#9333EA' : 'rgba(255,255,255,0.1)' }}
          >
            <motion.div
              animate={{ x: isAnon ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white"
            />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Confirm end modal ──────────────────────────────────────────────────────

function ConfirmEndModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-xs rounded-3xl p-6 text-center"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-4">🏁</div>
        <h2 className="text-white font-black text-xl mb-2">Dərsi Bitir?</h2>
        <p className="text-[#9CA3AF] text-sm mb-6">Bütün tələbələr dərsdən çıxacaq.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10">Ləğv et</button>
          <motion.button
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
          >
            Bitir
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Teacher View ───────────────────────────────────────────────────────────

type TeacherTab = 'attendance' | 'quiz' | 'poll' | 'participants'

const TEACHER_TABS: { key: TeacherTab; label: string; emoji: string }[] = [
  { key: 'attendance',   label: 'Davamiyyət',  emoji: '📋' },
  { key: 'quiz',         label: 'Canlı Quiz',  emoji: '❓' },
  { key: 'poll',         label: 'Sorğu',       emoji: '📊' },
  { key: 'participants', label: 'İştirakçılar', emoji: '👥' },
]

function TeacherView({ classroom, classroomId }: { classroom: ClassroomData; classroomId: string }) {
  const queryClient  = useQueryClient()
  const avatarColor  = useSelector((s: RootState) => s.theme.avatarColor)
  const { socketRef, isConnected, emit } = useSocket(classroomId)

  const [tab,        setTab]        = useState<TeacherTab>('attendance')
  const [showQuiz,   setShowQuiz]   = useState(false)
  const [showPoll,   setShowPoll]   = useState(false)
  const [showEnd,    setShowEnd]    = useState(false)
  const [recording,  setRecording]  = useState(classroom.isRecording)
  const [liveQuiz,   setLiveQuiz]   = useState<LiveQuiz | null>(null)
  const [livePoll,   setLivePoll]   = useState<PollData | null>(null)
  const [onlineList, setOnlineList] = useState<OnlineStudent[]>(MOCK_ONLINE)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE)
  const [elapsed,    setElapsed]    = useState('')
  const [qrCountdown, setQrCountdown] = useState(0)

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(classroom.startedAt)), 1000)
    return () => clearInterval(id)
  }, [classroom.startedAt])

  // QR countdown — updates every second
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(classroom.qrExpiresAt).getTime() - Date.now()) / 1000))
      setQrCountdown(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [classroom.qrExpiresAt])

  // Socket — listen for classroom events
  useEffect(() => {
    if (!isConnected || !socketRef.current) return
    const s = socketRef.current

    s.on('classroom:student_join', (data: { student: AttendanceRecord }) => {
      setAttendance(prev => {
        const idx = prev.findIndex(a => a.studentId === data.student.studentId)
        if (idx >= 0) { const n = [...prev]; n[idx] = data.student; return n }
        return [...prev, data.student]
      })
      toast.success(`${data.student.name} dərsə qoşuldu ✅`, { duration: 2000 })
    })

    s.on('classroom:hand_raise', (data: { studentId: string; name: string }) => {
      setOnlineList(prev => prev.map(s => s.studentId === data.studentId ? { ...s, handRaised: true } : s))
      toast(`🙋 ${data.name} söz almaq istəyir`, { duration: 3000 })
    })

    s.on('classroom:quiz_answer', (data: { results: number[]; totalAnswered: number }) => {
      setLiveQuiz(prev => prev ? { ...prev, results: data.results, totalAnswered: data.totalAnswered } : prev)
    })

    s.on('classroom:poll_answer', (data: { results: number[] }) => {
      setLivePoll(prev => prev ? { ...prev, results: data.results } : prev)
    })

    return () => {
      s.off('classroom:student_join')
      s.off('classroom:hand_raise')
      s.off('classroom:quiz_answer')
      s.off('classroom:poll_answer')
    }
  }, [isConnected, socketRef])

  // Mutations
  const endMutation = useMutation({
    mutationFn: () => api.post(`/classroom/${classroomId}/end`),
    onSuccess:  () => { toast.success('Dərs bitdi.'); queryClient.invalidateQueries({ queryKey: ['classroom', classroomId] }) },
    onError:    () => toast.error('Xəta baş verdi.'),
  })

  const attendanceMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.ATTENDANCE.SAVE, { classroomId, records: attendance }),
    onSuccess:  () => toast.success('Davamiyyət saxlandı! ✅'),
    onError:    () => toast.error('Saxlanmadı.'),
  })

  const markAll = () => {
    setAttendance(prev => prev.map(a => ({ ...a, status: 'present' as const })))
    toast.success('Hamısı iştirakçı sayıldı.')
  }

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => prev.map(a => {
      if (a.studentId !== studentId) return a
      const next = { present: 'absent', absent: 'waiting', waiting: 'present' } as const
      return { ...a, status: next[a.status as 'present' | 'absent' | 'waiting'] ?? a.status }
    }))
  }

  const sendQuiz = (q: { text: string; options: string[]; correctIndex: number }) => {
    const quiz: LiveQuiz = { _id: Date.now().toString(), ...q, results: new Array(q.options.length).fill(0), totalAnswered: 0, isActive: true }
    emit('classroom:quiz', quiz)
    setLiveQuiz(quiz)
    setShowQuiz(false)
    toast.success('Sual göndərildi! 📡')
  }

  const sendPoll = (p: { question: string; options: string[]; isAnon: boolean }) => {
    const poll: PollData = { _id: Date.now().toString(), ...p, results: new Array(p.options.length).fill(0), isActive: true }
    emit('classroom:poll', poll)
    setLivePoll(poll)
    setShowPoll(false)
    toast.success('Sorğu göndərildi! 📊')
  }

  const splitGroups = (n: number) => {
    const shuffled = [...onlineList].sort(() => Math.random() - 0.5)
    const groups: OnlineStudent[][] = Array.from({ length: n }, () => [])
    shuffled.forEach((s, i) => groups[i % n].push(s))
    toast.success(`${n} qrupa bölündü! 🎯`, { duration: 4000 })
    return groups
  }

  const presentCount  = attendance.filter(a => a.status === 'present' || a.status === 'distant').length
  const handCount     = onlineList.filter(o => o.handRaised).length

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">

      {/* Top bar */}
      <div
        className="px-4 py-4"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white font-black text-lg truncate">{classroom.title}</h1>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Canlı
              </motion.span>
              {recording && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                >
                  ⏺️ Qeyd edilir
                </motion.span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[#9CA3AF] text-xs">{classroom.classGroup}</span>
              <span className="text-[#9CA3AF] text-xs">⏱ {elapsed}</span>
              <span className="text-[#9CA3AF] text-xs">👥 {presentCount}/{attendance.length}</span>
              {handCount > 0 && (
                <span className="text-orange-400 text-xs font-bold">🙋 {handCount}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRecording(p => !p)}
              className="p-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: recording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                color:      recording ? '#EF4444' : '#9CA3AF',
              }}
              title="Qeyd et"
            >
              {recording ? '⏹' : '⏺️'}
            </button>
            <Link
              to={APP_ROUTES.CLASSROOM_QR(classroomId)}
              target="_blank"
              className="px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              📱 QR
            </Link>
            <button
              onClick={() => setShowEnd(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              🏁 Bitir
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-3xl mx-auto w-full px-4 mt-4">
        <div className="relative flex border-b border-white/10 mb-5">
          {TEACHER_TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition-colors relative"
                style={{ color: active ? avatarColor : '#9CA3AF' }}
              >
                <span className="text-base">{t.emoji}</span>
                <span className="hidden sm:block">{t.label}</span>
                {active && (
                  <motion.div
                    layoutId="cls-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: avatarColor }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >

            {/* ATTENDANCE */}
            {tab === 'attendance' && (
              <div>
                {/* QR section */}
                <div
                  className="rounded-2xl p-5 mb-5 flex flex-col items-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[#9CA3AF] text-xs mb-4">Tələbələr bu QR-ı skan etsin</p>

                  {/* Animated border around QR */}
                  <motion.div
                    animate={{ boxShadow: [`0 0 0 3px ${avatarColor}30`, `0 0 0 8px ${avatarColor}10`, `0 0 0 3px ${avatarColor}30`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="rounded-2xl overflow-hidden"
                  >
                    <QRCodeVisual token={classroom.qrToken} size={180} />
                  </motion.div>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-white font-black text-xl">{classroom.pin}</p>
                      <p className="text-[#9CA3AF] text-xs">PIN kod</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                      <p
                        className="font-black text-xl"
                        style={{ color: qrCountdown < 60 ? '#EF4444' : '#22C55E' }}
                      >
                        {Math.floor(qrCountdown / 60)}:{String(qrCountdown % 60).padStart(2, '0')}
                      </p>
                      <p className="text-[#9CA3AF] text-xs">QR vaxtı</p>
                    </div>
                  </div>

                  <button
                    onClick={markAll}
                    className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Hamısını İştirakçı Say
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Gəldi',      count: attendance.filter(a => a.status === 'present').length,  color: '#22C55E' },
                    { label: 'Distant',    count: attendance.filter(a => a.status === 'distant').length,  color: '#3B82F6' },
                    { label: 'Gözlənilir', count: attendance.filter(a => a.status === 'waiting').length,  color: '#EAB308' },
                    { label: 'Gəlmədi',    count: attendance.filter(a => a.status === 'absent').length,   color: '#EF4444' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: `${s.color}10` }}>
                      <div className="font-black text-lg" style={{ color: s.color }}>{s.count}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Student list */}
                <div className="space-y-2">
                  {attendance.map(a => (
                    <div
                      key={a.studentId}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: a.avatarColor }}
                      >
                        {a.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{a.name}</p>
                        {a.joinedAt && (
                          <p className="text-[#9CA3AF] text-[11px]">
                            {new Date(a.joinedAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <button onClick={() => { if (!a.isDistant) toggleStatus(a.studentId) }}>
                        <StatusBadge status={a.status} />
                      </button>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={() => attendanceMutation.mutate()}
                  disabled={attendanceMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm mt-5 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, #9333EA)` }}
                >
                  {attendanceMutation.isPending ? 'Saxlanılır...' : '💾 Hesabatı Saxla'}
                </motion.button>
              </div>
            )}

            {/* QUIZ TAB */}
            {tab === 'quiz' && (
              <div>
                <motion.button
                  onClick={() => setShowQuiz(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm mb-5"
                  style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 4px 20px rgba(147,51,234,0.4)' }}
                >
                  ➕ Yeni Sual Göndər
                </motion.button>

                {liveQuiz ? (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-bold text-sm">📡 Aktiv Sual</p>
                      <span className="text-green-400 text-xs font-bold">{liveQuiz.totalAnswered} cavab</span>
                    </div>
                    <p className="text-white text-sm mb-4">{liveQuiz.text}</p>

                    {/* Results bar chart */}
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={liveQuiz.options.map((opt, i) => ({ opt, count: liveQuiz.results[i] ?? 0 }))}
                        margin={{ top: 0, right: 4, bottom: 0, left: -24 }}
                      >
                        <XAxis dataKey="opt" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', borderRadius: 12, fontSize: 12 }}
                          formatter={(v) => [`${v} nəfər`, '']}
                        />
                        <Bar dataKey="count" radius={[6,6,0,0]}>
                          {liveQuiz.options.map((_, i) => (
                            <Cell key={i} fill={QUIZ_COLORS[i % QUIZ_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {liveQuiz.options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl"
                          style={{
                            background: i === liveQuiz.correctIndex ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                            border:     `1px solid ${i === liveQuiz.correctIndex ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
                          }}
                        >
                          <span className="text-white text-xs font-bold truncate">{opt}</span>
                          <span className="font-black text-sm ml-2" style={{ color: QUIZ_COLORS[i] }}>
                            {liveQuiz.results[i] ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-4">❓</div>
                    <p className="text-[#9CA3AF] text-sm">Hələ heç bir sual göndərilməyib.</p>
                  </div>
                )}
              </div>
            )}

            {/* POLL TAB */}
            {tab === 'poll' && (
              <div>
                <motion.button
                  onClick={() => setShowPoll(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm mb-5"
                  style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}
                >
                  📊 Sorğu Göndər
                </motion.button>

                {livePoll ? (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-white font-bold text-sm mb-4">{livePoll.question}</p>
                    {livePoll.options.map((opt, i) => {
                      const total = livePoll.results.reduce((a, b) => a + b, 0) || 1
                      const pct   = Math.round((livePoll.results[i] / total) * 100)
                      return (
                        <div key={i} className="mb-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-white text-sm">{opt}</span>
                            <span className="text-white font-bold text-sm">{livePoll.results[i]} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4 }}
                              className="h-full rounded-full"
                              style={{ background: QUIZ_COLORS[i % QUIZ_COLORS.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-4">📊</div>
                    <p className="text-[#9CA3AF] text-sm">Hələ heç bir sorğu göndərilməyib.</p>
                  </div>
                )}
              </div>
            )}

            {/* PARTICIPANTS TAB */}
            {tab === 'participants' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-bold text-sm">{onlineList.length} nəfər online</span>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => splitGroups(n)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        {n} qrup
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {onlineList.map(s => (
                    <motion.div
                      key={s.studentId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl"
                      style={{
                        background: s.handRaised ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${s.handRaised ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
                          style={{ backgroundColor: s.avatarColor }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        {s.isDistant && (
                          <span className="absolute -bottom-1 -right-1 text-xs bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">💻</span>
                        )}
                        {s.handRaised && (
                          <motion.span
                            className="absolute -top-2 -right-2 text-base"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          >
                            🙋
                          </motion.span>
                        )}
                      </div>
                      <p className="text-white text-xs font-bold text-center">{s.name}</p>
                      <button
                        onClick={() => {
                          emit('classroom:give_floor', { studentId: s.studentId })
                          setOnlineList(prev => prev.map(o => o.studentId === s.studentId ? { ...o, handRaised: false } : o))
                          toast.success(`${s.name}-ə söz verildi 🎤`)
                        }}
                        className="w-full py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: 'rgba(255,255,255,0.07)', color: '#9CA3AF' }}
                      >
                        Söz ver 🎤
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showQuiz && <QuizBuilderModal onClose={() => setShowQuiz(false)} onSend={sendQuiz} />}
        {showPoll && <PollBuilderModal onClose={() => setShowPoll(false)} onSend={sendPoll} />}
        {showEnd  && (
          <ConfirmEndModal
            onClose={() => setShowEnd(false)}
            onConfirm={() => { endMutation.mutate(); setShowEnd(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Student View ───────────────────────────────────────────────────────────

function StudentView({ classroom, classroomId }: { classroom: ClassroomData; classroomId: string }) {
  const user        = useSelector((s: RootState) => s.auth.user)
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const { socketRef, isConnected, emit } = useSocket(classroomId)

  const [joined,      setJoined]      = useState(false)
  const [handRaised,  setHandRaised]  = useState(false)
  const [liveQuiz,    setLiveQuiz]    = useState<LiveQuiz | null>(null)
  const [livePoll,    setLivePoll]    = useState<PollData | null>(null)
  const [myAnswer,    setMyAnswer]    = useState<number | null>(null)
  const [pollAnswer,  setPollAnswer]  = useState<number | null>(null)
  const [floorGranted, setFloorGranted] = useState(false)
  const [elapsed,     setElapsed]    = useState('')
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(classroom.startedAt)), 1000)
    return () => clearInterval(id)
  }, [classroom.startedAt])

  // Socket events
  useEffect(() => {
    if (!isConnected || !socketRef.current) return
    const s = socketRef.current

    s.on('classroom:quiz', (quiz: LiveQuiz) => {
      setLiveQuiz(quiz)
      setMyAnswer(null)
    })

    s.on('classroom:quiz_result', (data: { results: number[]; totalAnswered: number }) => {
      setLiveQuiz(prev => prev ? { ...prev, results: data.results, totalAnswered: data.totalAnswered } : prev)
    })

    s.on('classroom:poll', (poll: PollData) => {
      setLivePoll(poll)
      setPollAnswer(null)
    })

    s.on('classroom:floor_granted', (data: { studentId: string }) => {
      if (data.studentId === user?._id) {
        setFloorGranted(true)
        toast.success('Növbən gəldi! 🎤', { duration: 5000 })
        setTimeout(() => setFloorGranted(false), 10000)
      }
    })

    s.on('classroom:end', () => {
      toast('Dərs bitdi 🏁', { duration: 4000 })
    })

    return () => {
      s.off('classroom:quiz')
      s.off('classroom:quiz_result')
      s.off('classroom:poll')
      s.off('classroom:floor_granted')
      s.off('classroom:end')
    }
  }, [isConnected, socketRef, user?._id])

  const joinMutation = useMutation({
    mutationFn: () => api.post(API_ROUTES.CLASSROOM.JOIN(classroomId)),
    onSuccess: () => {
      setJoined(true)
      toast.success('Davamiyyətin qeyd olundu ✅')
      // Start heartbeat (distant tracking)
      heartbeatRef.current = setInterval(() => {
        api.post(API_ROUTES.CLASSROOM.HEARTBEAT(classroomId)).catch(() => {})
      }, 1000 * 120)
    },
    onError: () => toast.error('Qoşularkən xəta baş verdi.'),
  })

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  const submitQuizAnswer = (index: number) => {
    if (myAnswer !== null) return
    setMyAnswer(index)
    emit('classroom:quiz_answer', { classroomId, questionId: liveQuiz?._id, answerIndex: index })
    toast.success('Cavabın qəbul edildi ✅', { duration: 2000 })
  }

  const submitPollAnswer = (index: number) => {
    if (pollAnswer !== null) return
    setPollAnswer(index)
    emit('classroom:poll_answer', { classroomId, pollId: livePoll?._id, answerIndex: index })
  }

  const toggleHand = () => {
    const next = !handRaised
    setHandRaised(next)
    emit(next ? 'classroom:hand_raise' : 'classroom:hand_lower', { classroomId })
    if (next) toast('🙋 Söz almaq üçün gözlə...', { duration: 3000 })
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="w-full max-w-xs"
        >
          {/* Teacher avatar */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-3xl mb-3"
              style={{ backgroundColor: classroom.teacherAvatar, boxShadow: `0 0 32px ${classroom.teacherAvatar}50` }}
            >
              {classroom.teacherName.charAt(0)}
            </div>
            <p className="text-white font-bold text-lg">{classroom.teacherName}</p>
            <p className="text-[#9CA3AF] text-sm mt-1">{classroom.title}</p>
            <p className="text-[#9CA3AF] text-xs">{classroom.classGroup}</p>
          </div>

          <motion.button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`, boxShadow: `0 6px 24px ${avatarColor}50` }}
          >
            {joinMutation.isPending ? 'Qoşulur...' : '✅ Dərsə Qoşul'}
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">

      {/* Top bar */}
      <div
        className="px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">{classroom.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-xs text-red-400 font-bold"
              >
                🔴 Dərs davam edir
              </motion.span>
              <span className="text-[#9CA3AF] text-xs">⏱ {elapsed}</span>
            </div>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            ✅ Qatıldın
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {/* Floor granted notification */}
        <AnimatePresence>
          {floorGranted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl text-center"
              style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)', boxShadow: '0 8px 32px rgba(147,51,234,0.5)' }}
            >
              <p className="text-white font-black text-xl">🎤 Növbən gəldi!</p>
              <p className="text-white/80 text-sm">İndi danışa bilərsən</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live quiz overlay */}
        <AnimatePresence>
          {liveQuiz && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="fixed inset-0 z-40 bg-[#0D0D0D] flex flex-col items-center justify-center p-6"
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: myAnswer === null ? Infinity : 0 }}
                className="text-sm font-bold mb-4 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}
              >
                📡 Müəllimdən Sual Gəldi!
              </motion.div>

              <div
                className="w-full max-w-sm rounded-2xl p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${avatarColor}30` }}
              >
                <p className="text-white font-bold text-lg text-center">{liveQuiz.text}</p>
              </div>

              <div className="w-full max-w-sm space-y-3">
                {liveQuiz.options.map((opt, i) => {
                  const answered = myAnswer !== null
                  const isChosen = myAnswer === i
                  const isCorrect = i === liveQuiz.correctIndex
                  let bg = `${QUIZ_COLORS[i]}20`
                  let border = `${QUIZ_COLORS[i]}40`
                  if (answered) {
                    if (isCorrect) { bg = 'rgba(34,197,94,0.2)'; border = 'rgba(34,197,94,0.5)' }
                    else if (isChosen) { bg = 'rgba(239,68,68,0.2)'; border = 'rgba(239,68,68,0.5)' }
                  }
                  return (
                    <motion.button
                      key={i}
                      onClick={() => submitQuizAnswer(i)}
                      disabled={answered}
                      whileHover={!answered ? { scale: 1.02 } : {}}
                      whileTap={!answered ? { scale: 0.97 } : {}}
                      className="w-full py-4 rounded-2xl font-bold text-white text-sm text-left px-5 transition-all"
                      style={{ background: bg, border: `2px solid ${border}` }}
                    >
                      <span className="font-black mr-2" style={{ color: QUIZ_COLORS[i] }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                      {answered && isCorrect && <span className="ml-2">✅</span>}
                      {answered && isChosen && !isCorrect && <span className="ml-2">❌</span>}
                    </motion.button>
                  )
                })}
              </div>

              {myAnswer !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center"
                >
                  <p className="text-[#9CA3AF] text-sm">
                    {liveQuiz.totalAnswered} nəfər cavabladı
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poll bottom sheet */}
        <AnimatePresence>
          {livePoll && pollAnswer === null && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-6"
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <p className="text-white font-bold text-base text-center mb-4">{livePoll.question}</p>
              <div className="flex gap-3">
                {livePoll.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    onClick={() => submitPollAnswer(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-4 rounded-2xl font-bold text-white text-sm"
                    style={{ background: `${QUIZ_COLORS[i]}20`, border: `1px solid ${QUIZ_COLORS[i]}40` }}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
              {livePoll.isAnon && (
                <p className="text-center text-[#9CA3AF] text-xs mt-3">🔒 Anonim cavab</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Normal student panel */}
        {!liveQuiz && (
          <div className="w-full max-w-sm flex flex-col items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-3xl"
              style={{ backgroundColor: avatarColor, boxShadow: `0 0 32px ${avatarColor}50` }}
            >
              {user?.name?.charAt(0) ?? '?'}
            </div>

            <p className="text-white font-bold text-lg">{user?.name} {user?.surname}</p>

            {/* Hand raise */}
            <motion.button
              onClick={toggleHand}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              animate={handRaised ? { scale: [1, 1.06, 1] } : {}}
              transition={handRaised ? { duration: 1.2, repeat: Infinity } : {}}
              className="w-full py-5 rounded-2xl font-black text-white text-xl"
              style={{
                background: handRaised
                  ? 'linear-gradient(135deg, #EAB308, #F97316)'
                  : `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
                boxShadow: handRaised
                  ? '0 6px 28px rgba(234,179,8,0.5)'
                  : `0 6px 28px ${avatarColor}50`,
              }}
            >
              {handRaised ? '🙋 Gözlənilir...' : '🙋 Söz Al'}
            </motion.button>

            <div
              className="w-full p-4 rounded-2xl text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[#9CA3AF] text-sm">Müəllim sual göndərəndə</p>
              <p className="text-[#9CA3AF] text-sm">ekranda görünəcək ⚡</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main entry ─────────────────────────────────────────────────────────────

export default function ClassroomRoom() {
  const { id }  = useParams<{ id: string }>()
  const user    = useSelector((s: RootState) => s.auth.user)

  const { data: classroom, isLoading } = useQuery<ClassroomData>({
    queryKey: ['classroom', id],
    queryFn:  () => api.get<{ data: ClassroomData }>(API_ROUTES.CLASSROOM.BY_ID(id!))
                      .then(r => r.data.data)
                      .catch(() => MOCK_CLASSROOM),
    enabled:  !!id,
    staleTime: 1000 * 30,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const c = classroom ?? MOCK_CLASSROOM

  if (user?.role === 'teacher') {
    return <TeacherView classroom={c} classroomId={id!} />
  }

  return <StudentView classroom={c} classroomId={id!} />
}
