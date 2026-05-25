import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import { useInterval } from '../hooks/useInterval'
import api             from '../lib/api'
import { API_ROUTES }  from '../constants'
import type { RootState } from '../app/store'
import type {
  MysteryCurrentResponse,
  WeeklyMysteryQuestion,
  WeeklyWinner,
  WeeklyStats,
} from '../types'

// ── Mock data ─────────────────────────────────────────────────────────────

function nextMonday09(): string {
  const d   = new Date()
  const day = d.getDay()
  const add = day === 0 ? 1 : day === 1 ? (d.getHours() < 9 ? 0 : 7) : 8 - day
  d.setDate(d.getDate() + add)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

const MOCK_CURRENT: MysteryCurrentResponse = {
  status:      'waiting',
  nextRevealAt: nextMonday09(),
}

const MOCK_QUESTION: WeeklyMysteryQuestion = {
  _id:          'wm-2025-21',
  text:         'Avropada paytaxt olmayan, lakin ölkənin ən böyük şəhəri olan — ikinci dünya müharibəsindən sonra ölkə ikiyə bölündükdə paytaxt statusunu itirmiş şəhər hansıdır?',
  difficulty:   'legendary',
  weekNumber:   21,
  revealedAt:   new Date().toISOString(),
  attemptCount: 1247,
  isSolved:     false,
}

const MOCK_WINNERS: WeeklyWinner[] = [
  { userId: 'w1', name: 'Aytən M.',  city: 'Bakı',       avatarColor: '#9333EA', solvedInMinutes: 14, solvedAt: '', weekNumber: 20 },
  { userId: 'w2', name: 'Kənan H.',  city: 'Gəncə',      avatarColor: '#3B82F6', solvedInMinutes: 22, solvedAt: '', weekNumber: 19 },
  { userId: 'w3', name: 'Nigar Ə.',  city: 'Bakı',       avatarColor: '#06B6D4', solvedInMinutes: 8,  solvedAt: '', weekNumber: 18 },
  { userId: 'w4', name: 'Rauf T.',   city: 'Sumqayıt',   avatarColor: '#F97316', solvedInMinutes: 31, solvedAt: '', weekNumber: 17 },
]

const MOCK_STATS: WeeklyStats = {
  attemptCount:   1247,
  solvedCount:    1,
  fastestMinutes: 8,
  fastestSeconds: 43,
}

const CITY_STATS = [
  { city: 'Bakı',       attempts: 847 },
  { city: 'Gəncə',      attempts: 234 },
  { city: 'Sumqayıt',   attempts: 189 },
  { city: 'Mingəçevir', attempts: 78  },
  { city: 'Naxçıvan',   attempts: 65  },
]

const FINALISTS: { name: string; color: string; week: number }[] = [
  { name: 'Aytən M.',  color: '#9333EA', week: 20 },
  { name: 'Kənan H.',  color: '#3B82F6', week: 19 },
  { name: 'Nigar Ə.',  color: '#06B6D4', week: 18 },
  { name: 'Rauf T.',   color: '#F97316', week: 17 },
  { name: 'Leyla K.',  color: '#EC4899', week: 16 },
  { name: 'Əli S.',    color: '#58CC02', week: 15 },
]

// ── Star background ───────────────────────────────────────────────────────

function StarBackground() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5, dur: Math.random() * 4 + 2,
  }))
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0d0d2e 0%, #050510 60%, #000 100%)' }}>
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: Math.random() * 4 }}
        />
      ))}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                      rounded-full blur-[100px] opacity-15"
        style={{ background: 'radial-gradient(circle, #9333EA 0%, transparent 70%)' }} />
    </div>
  )
}

// ── Flip card digit ───────────────────────────────────────────────────────

function FlipCard({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgba(0,0,0,0.5)] z-10" />
        <AnimatePresence mode="wait">
          <motion.span
            key={str}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' as const }}
            className="font-black text-white tabular-nums z-20 relative"
            style={{ fontSize: 36 }}
          >
            {str}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[#9CA3AF] text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  )
}

function FlipClock({ targetDate }: { targetDate: string }) {
  const [diff, setDiff] = useState(Math.max(0, new Date(targetDate).getTime() - Date.now()))

  useInterval(() => {
    setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()))
  }, 1000)

  const days = Math.floor(diff / 86_400_000)
  const h    = Math.floor((diff % 86_400_000) / 3_600_000)
  const m    = Math.floor((diff % 3_600_000) / 60_000)
  const s    = Math.floor((diff % 60_000) / 1000)

  return (
    <div className="flex items-center gap-3 lg:gap-4">
      <FlipCard value={days} label="Gün" />
      <span className="text-[#9333EA] font-black text-3xl mb-6">:</span>
      <FlipCard value={h}    label="Saat" />
      <span className="text-[#9333EA] font-black text-3xl mb-6">:</span>
      <FlipCard value={m}    label="Dəq" />
      <span className="text-[#9333EA] font-black text-3xl mb-6">:</span>
      <FlipCard value={s}    label="San" />
    </div>
  )
}

// ── Past winners grid ─────────────────────────────────────────────────────

function PastWinnersSection({ winners }: { winners: WeeklyWinner[] }) {
  return (
    <div className="w-full">
      <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
        <span>🏆</span> Son qaliblər
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {winners.map((w, i) => (
          <motion.div
            key={w.userId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="group relative rounded-2xl p-4 flex flex-col items-center gap-2 cursor-default"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg"
              style={{ backgroundColor: w.avatarColor, boxShadow: `0 0 16px ${w.avatarColor}50` }}
            >
              {w.name.charAt(0)}
            </div>
            <p className="text-white font-semibold text-xs text-center truncate w-full">{w.name}</p>
            <p className="text-[#9CA3AF] text-[10px] text-center">{w.city}</p>
            <p className="text-[10px] font-bold" style={{ color: w.avatarColor }}>
              {w.solvedInMinutes} dəqiqədə
            </p>
            {/* Tooltip */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity
                            flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.8)' }}>
              <span className="text-white text-xs font-semibold text-center px-3">Sən də edə bilərsən! 💪</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Stats pills ───────────────────────────────────────────────────────────

function StatsSection({ stats }: { stats: WeeklyStats }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 w-full">
      {[
        { label: 'Bu həftə cəhd etdi', value: stats.attemptCount.toLocaleString(), color: '#3B82F6', emoji: '👥' },
        { label: 'Yalnız bu qədəri tapdı', value: stats.solvedCount, color: '#22C55E', emoji: '✅' },
        { label: 'Ən sürətli', value: `${stats.fastestMinutes}:${String(stats.fastestSeconds).padStart(2,'0')}`, color: '#F97316', emoji: '⚡' },
      ].map(s => (
        <div
          key={s.label}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
          style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}
        >
          <span>{s.emoji}</span>
          <span className="font-black" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[#9CA3AF]">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Active question + answer form ─────────────────────────────────────────

function ActiveQuestionView({
  question,
  avatarColor,
  onSubmit,
  isSubmitting,
  submitResult,
}: {
  question:     WeeklyMysteryQuestion
  avatarColor:  string
  onSubmit:     (a: string, ex: string, rt: number) => void
  isSubmitting: boolean
  submitResult: 'idle' | 'wrong' | 'correct'
}) {
  const [answer,       setAnswer]       = useState('')
  const [explanation,  setExplanation]  = useState('')
  const [aiCheck,      setAiCheck]      = useState(false)
  const [elapsed,      setElapsed]      = useState(0)
  const [fastWarning,  setFastWarning]  = useState(false)
  const openedAt = useRef(Date.now())

  useInterval(() => setElapsed(e => e + 1), 1000)

  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60

  function handleSubmit() {
    const rt = Math.floor((Date.now() - openedAt.current) / 1000)
    if (rt < 30) { setFastWarning(true); return }
    if (!answer.trim())           { toast.error('Cavab yazın!'); return }
    if (explanation.length < 20)  { toast.error('İzah çox qısa (min. 20 hərif)!'); return }
    if (!aiCheck)                 { toast.error('AI məsuliyyəti qutusunu işarələyin!'); return }
    onSubmit(answer, explanation, rt)
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className="w-full max-w-xl mx-auto flex flex-col gap-5"
    >
      {/* Elapsed timer */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[#9CA3AF] text-xs">
          <motion.div
            className="w-2 h-2 rounded-full bg-[#EF4444]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          {elapsedMin}:{String(elapsedSec).padStart(2, '0')} düşünürsən
        </div>
        <div className="flex items-center gap-1.5 text-[#9CA3AF] text-xs">
          <span>👁</span>
          <span>{question.attemptCount.toLocaleString()} nəfər cəhd edir</span>
        </div>
      </div>

      {/* Question card */}
      <div
        className="rounded-3xl p-6 lg:p-8"
        style={{
          background:   'rgba(17,24,39,0.8)',
          border:       `1px solid ${avatarColor}40`,
          boxShadow:    `0 0 60px ${avatarColor}20`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔮</span>
          <span className="text-xs font-bold uppercase tracking-widest"
            style={{ color: avatarColor }}>
            Həftə #{question.weekNumber} · {question.difficulty === 'legendary' ? '🌟 Əfsanəvi' : '🔥 Çətin'}
          </span>
        </div>
        <p className="text-white font-bold text-lg lg:text-xl leading-relaxed">
          {question.text}
        </p>
        <p className="text-[#9CA3AF] text-xs mt-3">Bu sualın tək düzgün cavabı var.</p>
      </div>

      {/* Answer form */}
      {submitResult === 'idle' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-white text-sm font-semibold block mb-2">Cavabın:</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Cavabını yaz..."
              rows={2}
              className="w-full rounded-2xl px-4 py-3 text-white text-sm resize-none outline-none transition-all"
              style={{
                background:  'rgba(255,255,255,0.06)',
                border:      `1px solid ${answer ? avatarColor + '60' : 'rgba(255,255,255,0.12)'}`,
                caretColor:  avatarColor,
              }}
            />
          </div>

          <div>
            <label className="text-white text-sm font-semibold block mb-2">
              Necə tapdın? İzah et:
              <span className="text-[#9CA3AF] font-normal ml-2 text-xs">(min. 20 hərif)</span>
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Düşüncə prosesini izah et..."
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-white text-sm resize-none outline-none transition-all"
              style={{
                background:  'rgba(255,255,255,0.06)',
                border:      `1px solid ${explanation.length >= 20 ? '#22C55E60' : 'rgba(255,255,255,0.12)'}`,
                caretColor:  avatarColor,
              }}
            />
            <p className="text-[#9CA3AF] text-xs mt-1 text-right">{explanation.length}/20+</p>
          </div>

          {/* AI disclaimer */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setAiCheck(v => !v)}
              className="w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 transition-all border-2"
              style={{
                backgroundColor: aiCheck ? avatarColor : 'transparent',
                borderColor:     aiCheck ? avatarColor : 'rgba(255,255,255,0.3)',
              }}
            >
              {aiCheck && <span className="text-white text-xs font-black">✓</span>}
            </div>
            <span className="text-[#9CA3AF] text-sm leading-relaxed">
              Bu cavabı özüm tapdım — AI köməyi istifadə etmədim. Şərəf sözü verirəm.
            </span>
          </label>

          {/* Speed warning */}
          <AnimatePresence>
            {fastWarning && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', color: '#EAB308' }}
              >
                ⚠️ Çox tez! Ən azı 30 saniyə düşün. Cavabını izah et.
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
              boxShadow:  `0 4px 20px ${avatarColor}40`,
            }}
          >
            {isSubmitting ? 'Yoxlanılır...' : 'Cavabı Göndər 🔮'}
          </motion.button>
        </div>
      )}

      {/* Submit feedback */}
      {submitResult === 'wrong' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <p className="text-3xl mb-2">🧙‍♀️</p>
          <p className="text-white font-bold">Bu cavab düzgün deyil.</p>
          <p className="text-[#9CA3AF] text-sm mt-1">Cora deyir: "Daha dərindən düşün!"</p>
        </motion.div>
      )}

      {submitResult === 'correct' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-white font-bold text-lg">Qəbul edildi!</p>
          <p className="text-[#9CA3AF] text-sm mt-1">Nəticə yaxında elan olunacaq...</p>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Winner announcement overlay ───────────────────────────────────────────

function WinnerReveal({ winner, correctAnswer }: { winner: WeeklyWinner; correctAnswer?: string; avatarColor: string }) {
  const [showConfetti, setShowConfetti] = useState(true)
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 2500); return () => clearTimeout(t) }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full flex flex-col items-center gap-6 py-6"
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
        <AnimatePresence>
          {showConfetti && Array.from({ length: 28 }).map((_, i) => {
            const angle = (i / 28) * 2 * Math.PI
            const dist  = 140 + Math.random() * 80
            const cols  = ['#FFD700','#9333EA','#3B82F6','#EF4444','#22C55E','#EC4899']
            return (
              <motion.div key={i} className="absolute rounded-sm"
                style={{ backgroundColor: cols[i % cols.length], width: 8, height: 8, top: '40%', left: '50%' }}
                initial={{ x:0, y:0, opacity:1, rotate:0 }}
                animate={{ x: Math.cos(angle)*dist, y: Math.sin(angle)*dist-60, opacity:0, rotate: Math.random()*480 }}
                transition={{ duration: 1.6, ease:'easeOut' }}
              />
            )
          })}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="text-5xl">👑</span>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-3xl"
          style={{ backgroundColor: winner.avatarColor, boxShadow: `0 0 40px ${winner.avatarColor}70` }}
        >
          {winner.name.charAt(0)}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <h2 className="font-black text-3xl" style={{ background: 'linear-gradient(135deg,#FFD700,#F97316)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          🏆 Bu həftənin sirri açıldı!
        </h2>
        <p className="text-white font-bold text-lg mt-2">{winner.name}</p>
        <p className="text-[#9CA3AF] text-sm">{winner.city} · {winner.solvedInMinutes} dəqiqədə tapdı</p>
      </motion.div>

      {correctAnswer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-md rounded-2xl p-4 text-center"
          style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)' }}
        >
          <p className="text-[#9CA3AF] text-xs mb-1">Düzgün cavab</p>
          <p className="text-white font-bold">{correctAnswer}</p>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <motion.span className="text-5xl" animate={{ y:[0,-10,0] }} transition={{ duration:1.8, repeat:Infinity }}>🤖</motion.span>
        <motion.span className="text-5xl" animate={{ y:[0,-10,0] }} transition={{ duration:1.8, repeat:Infinity, delay:0.3 }}>🧙‍♀️</motion.span>
      </div>
    </motion.div>
  )
}

// ── Live stats panel ──────────────────────────────────────────────────────

function LivePanel({ stats }: { stats: WeeklyStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-4 w-full lg:w-72 shrink-0"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-sm">🌍 Canlı Statistika</span>
        <motion.div className="w-2 h-2 rounded-full bg-[#22C55E]"
          animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.5, repeat:Infinity }} />
      </div>

      <div className="space-y-2">
        <p className="text-[#9CA3AF] text-xs">Şəhər əsasında</p>
        {CITY_STATS.map((c, i) => (
          <div key={c.city} className="flex items-center justify-between">
            <span className="text-white text-xs">{i+1}. {c.city}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#3B82F6]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.attempts / 847) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.7 }}
                />
              </div>
              <span className="text-[#9CA3AF] text-[10px] w-8 text-right">{c.attempts}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[rgba(255,255,255,0.07)] pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[#9CA3AF]">Cəmi cəhd</span>
          <span className="text-white font-bold">{stats.attemptCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#9CA3AF]">Həll etdi</span>
          <span className="text-[#22C55E] font-bold">{stats.solvedCount}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Floating reactions ────────────────────────────────────────────────────

type Reaction = { id: number; emoji: string; x: number }

function ReactionsBar({ onReact }: { onReact: (e: string) => void }) {
  return (
    <div className="flex items-center gap-3 justify-center flex-wrap">
      {['🔥', '💡', '🤔', '😱'].map(e => (
        <motion.button
          key={e}
          onClick={() => onReact(e)}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.85 }}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {e}
        </motion.button>
      ))}
    </div>
  )
}

// ── Final section ─────────────────────────────────────────────────────────

function FinalSection({ avatarColor }: { avatarColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-3xl p-6 lg:p-8 flex flex-col gap-6"
      style={{
        background: 'linear-gradient(135deg, rgba(147,51,234,0.1) 0%, rgba(59,130,246,0.08) 100%)',
        border:     '1px solid rgba(147,51,234,0.3)',
      }}
    >
      <div className="text-center">
        <h3 className="text-white font-black text-xl">⚔️ Sirrlərin Döyüşü — Final</h3>
        <p className="text-[#9CA3AF] text-sm mt-1">26 həftəlik qaliblər böyük finala çıxır</p>
      </div>

      {/* Finalists grid */}
      <div className="flex flex-wrap justify-center gap-3">
        {FINALISTS.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-base"
              style={{ backgroundColor: f.color, boxShadow: `0 0 12px ${f.color}50` }}
            >
              {f.name.charAt(0)}
            </div>
            <span className="text-[#9CA3AF] text-[9px] text-center">{f.name}</span>
            <span className="text-[9px]" style={{ color: f.color }}>#{f.week}</span>
          </motion.div>
        ))}
        {/* Empty finalist slots */}
        {Array.from({ length: Math.max(0, 26 - FINALISTS.length) }).map((_, i) => (
          <motion.div
            key={`empty-${i}`}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ border: '2px dashed rgba(255,255,255,0.12)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          >
            <span className="text-[#9CA3AF] text-xs">?</span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="text-center sm:text-left">
          <p className="text-white font-bold text-sm">📺 TikTok + YouTube-da canlı yayım</p>
          <p className="text-[#9CA3AF] text-xs mt-0.5">Tarix açıqlanacaq</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => toast.success('Xatırlatma aktivləşdirildi!')}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${avatarColor}, #9333EA)`,
            boxShadow:  `0 4px 14px ${avatarColor}40`,
          }}
        >
          🔔 Xatırlat
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Main WeeklyMystery ────────────────────────────────────────────────────

type SubmitResult = 'idle' | 'wrong' | 'correct'

export default function WeeklyMystery() {
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const queryClient = useQueryClient()

  const [floatingReactions, setFloatingReactions] = useState<Reaction[]>([])
  const [submitResult,      setSubmitResult]       = useState<SubmitResult>('idle')
  const [revealShown,       setRevealShown]         = useState(false)

  // Queries
  const { data: current, isLoading: loadingCurrent } = useQuery<MysteryCurrentResponse>({
    queryKey:       ['mystery', 'current'],
    queryFn:        () => api.get<{ data: MysteryCurrentResponse }>(API_ROUTES.MYSTERY.CURRENT)
                             .then(r => r.data.data)
                             .catch(() => MOCK_CURRENT),
    refetchInterval: 30_000,
    staleTime:       20_000,
  })

  const { data: winners = [] } = useQuery<WeeklyWinner[]>({
    queryKey: ['mystery', 'winners'],
    queryFn:  () => api.get<{ data: WeeklyWinner[] }>(API_ROUTES.MYSTERY.WINNERS)
                       .then(r => r.data.data)
                       .catch(() => MOCK_WINNERS),
    staleTime: 1000 * 60 * 5,
  })

  const { data: stats } = useQuery<WeeklyStats>({
    queryKey:        ['mystery', 'stats'],
    queryFn:         () => api.get<{ data: WeeklyStats }>(API_ROUTES.MYSTERY.STATS)
                              .then(r => r.data.data)
                              .catch(() => MOCK_STATS),
    refetchInterval: 30_000,
  })

  // Answer mutation
  const mutation = useMutation({
    mutationFn: (body: { answer: string; explanation: string; responseTime: number; aiDisclaimer: boolean }) =>
      api.post<{ data: { correct: boolean } }>(API_ROUTES.MYSTERY.ANSWER, body).then(r => r.data.data),
    onSuccess: res => {
      setSubmitResult(res.correct ? 'correct' : 'wrong')
      if (res.correct) queryClient.invalidateQueries({ queryKey: ['mystery', 'current'] })
    },
    onError: () => setSubmitResult('wrong'),
  })

  // Dramatic reveal: show animation once when status goes active
  useEffect(() => {
    if (current?.status === 'active' && !revealShown) {
      setRevealShown(true)
    }
  }, [current?.status, revealShown])

  const handleAnswer = useCallback((answer: string, explanation: string, responseTime: number) => {
    mutation.mutate({ answer, explanation, responseTime, aiDisclaimer: true })
  }, [mutation])

  function sendReaction(emoji: string) {
    const id = Date.now()
    setFloatingReactions(prev => [...prev, { id, emoji, x: Math.random() * 70 + 15 }])
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2200)
  }

  // ── Derived state ─────────────────────────────────────────────────────

  const status   = current?.status ?? 'waiting'
  const question = current?.question ?? (status === 'active' ? MOCK_QUESTION : undefined)
  const liveStats = stats ?? MOCK_STATS

  if (loadingCurrent) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
          className="w-12 h-12 rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${avatarColor} ${avatarColor}30 ${avatarColor}30 ${avatarColor}30` }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <StarBackground />

      {/* Floating reactions */}
      <AnimatePresence>
        {floatingReactions.map(r => (
          <motion.div
            key={r.id}
            className="fixed z-50 text-3xl pointer-events-none"
            style={{ left: `${r.x}%`, bottom: '80px' }}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -250, opacity: 0 }}
            exit={{}}
            transition={{ duration: 2, ease: 'easeOut' as const }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center px-4 py-8 gap-10 max-w-4xl mx-auto w-full">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="font-black text-3xl lg:text-4xl text-white">🔮 Həftənin Sirri</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Hər bazar ertəsi 09:00-da yeni sir açılır</p>
        </motion.div>

        {/* ── WAITING state ── */}
        {status === 'waiting' && (
          <>
            {/* Mascots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-end justify-center gap-8 lg:gap-16"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <motion.span className="text-5xl" animate={{ rotate:[-5,5,-5] }} transition={{ duration:3, repeat:Infinity }}>🤖</motion.span>
                <p className="text-[#9CA3AF] text-xs max-w-[120px]">"Hazırsan? Bu həftə nə gətirəcəyik..."</p>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <motion.span className="text-5xl" animate={{ rotate:[5,-5,5] }} transition={{ duration:3, repeat:Infinity, delay:0.5 }}>🧙‍♀️</motion.span>
                <p className="text-[#9CA3AF] text-xs max-w-[120px]">"Yalnız ən güclülər tapa bilər!"</p>
              </div>
            </motion.div>

            {/* Countdown */}
            {current?.nextRevealAt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-[#9CA3AF] text-sm">Növbəti sirə qədər:</p>
                <FlipClock targetDate={current.nextRevealAt} />
              </motion.div>
            )}

            <StatsSection stats={liveStats} />
            <PastWinnersSection winners={winners} />
            <FinalSection avatarColor={avatarColor} />

            {/* Spectator reactions */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-[#9CA3AF] text-xs">Reaksiya göndər</p>
              <ReactionsBar onReact={sendReaction} />
            </div>
          </>
        )}

        {/* ── ACTIVE state ── */}
        {status === 'active' && question && (
          <>
            {/* Dramatic reveal banner */}
            {revealShown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.h2
                  className="font-black text-2xl lg:text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #F97316, #FFD700)',
                    backgroundSize: '200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 2s linear infinite',
                  }}
                >
                  ✨ Həftənin Sirri Açıldı!
                </motion.h2>
                <div className="flex justify-center gap-4 mt-2">
                  <motion.span className="text-4xl" animate={{ y:[0,-8,0] }} transition={{ duration:1.5, repeat:Infinity }}>🤖</motion.span>
                  <motion.span className="text-4xl" animate={{ y:[0,-8,0] }} transition={{ duration:1.5, repeat:Infinity, delay:0.3 }}>🧙‍♀️</motion.span>
                </div>
              </motion.div>
            )}

            {/* Main layout: question left, live panel right */}
            <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
              <div className="flex-1">
                <ActiveQuestionView
                  question={question}
                  avatarColor={avatarColor}
                  onSubmit={handleAnswer}
                  isSubmitting={mutation.isPending}
                  submitResult={submitResult}
                />
              </div>
              <LivePanel stats={liveStats} />
            </div>

            <ReactionsBar onReact={sendReaction} />
            <FinalSection avatarColor={avatarColor} />
          </>
        )}

        {/* ── SOLVED state ── */}
        {status === 'solved' && question?.winner && (
          <>
            <WinnerReveal
              winner={question.winner}
              correctAnswer={question.answer}
              avatarColor={avatarColor}
            />
            <PastWinnersSection winners={winners} />
            <FinalSection avatarColor={avatarColor} />
          </>
        )}

      </div>
    </div>
  )
}
