import { motion } from 'framer-motion'
import type { Question, AgeGroup } from '../../../types'

interface Props {
  question:       Question
  onAnswer:       (id: string) => void
  isAnswered:     boolean
  correctAnswer:  string
  selectedAnswer: string | null
  avatarColor:    string
  timeLeft:       number
  totalTime:      number
  ageGroup?:      AgeGroup
}

const QUAD_COLORS = [
  { base: '#EF4444', light: 'rgba(239,68,68,0.85)',   emoji: '🔴' },
  { base: '#3B82F6', light: 'rgba(59,130,246,0.85)',  emoji: '🔵' },
  { base: '#EAB308', light: 'rgba(234,179,8,0.85)',   emoji: '🟡' },
  { base: '#22C55E', light: 'rgba(34,197,94,0.85)',   emoji: '🟢' },
]

function timerColor(pct: number): string {
  if (pct > 0.5) return '#22C55E'
  if (pct > 0.25) return '#EAB308'
  return '#EF4444'
}

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'az-AZ'
  window.speechSynthesis.speak(u)
}

export default function FormatB({ question, onAnswer, isAnswered, correctAnswer, selectedAnswer, timeLeft, totalTime }: Props) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = totalTime > 0 ? timeLeft / totalTime : 0
  const dashOffset = circ * (1 - pct)
  const color = timerColor(pct)

  // Ensure 4 options (pad if needed)
  const opts = [...question.options].slice(0, 4)

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full px-4">
      {/* Circular timer + question */}
      <div className="flex flex-col items-center gap-3">
        {/* SVG circular timer */}
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="rgba(255,255,255,0.08)" strokeWidth="7" stroke="none" />
          <circle
            cx="44" cy="44" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s' }}
          />
          <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize="20" fontWeight="900">
            {timeLeft}
          </text>
        </svg>

        {/* Question */}
        <div className="flex items-center gap-2">
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white font-bold text-xl text-center max-w-sm"
          >
            {question.emoji && <span className="mr-2">{question.emoji}</span>}
            {question.text}
          </motion.p>
          <button
            onClick={() => speak(question.text)}
            className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-sm"
            aria-label="Sualı dinlə"
          >
            🔊
          </button>
        </div>
      </div>

      {/* 2×2 quadrant grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {opts.map((opt, i) => {
          const qc = QUAD_COLORS[i] ?? QUAD_COLORS[0]
          const isSelected = selectedAnswer === opt.id
          const isCorrectOpt = opt.id === correctAnswer
          const dimmed = isAnswered && !isCorrectOpt && !isSelected

          let bg = qc.light
          if (isAnswered && isCorrectOpt) bg = `rgba(34,197,94,0.9)`
          if (isAnswered && isSelected && !isCorrectOpt) bg = `rgba(239,68,68,0.9)`

          return (
            <motion.button
              key={opt.id}
              onClick={() => !isAnswered && onAnswer(opt.id)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={
                isAnswered && isSelected && !isCorrectOpt
                  ? { opacity: dimmed ? 0.35 : 1, scale: 1, x: [0, -8, 8, -6, 6, 0] }
                  : { opacity: dimmed ? 0.35 : 1, scale: 1 }
              }
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={!isAnswered ? { scale: 1.04 } : {}}
              whileTap={!isAnswered ? { scale: 0.96 } : {}}
              disabled={isAnswered}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 p-4 min-h-[100px] font-bold text-white"
              style={{ backgroundColor: bg }}
              aria-label={opt.text}
            >
              <span className="text-3xl">{opt.emoji ?? qc.emoji}</span>
              <span className="text-sm text-center leading-tight">{opt.text}</span>
              {isAnswered && isCorrectOpt && <span className="text-xl">✅</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
