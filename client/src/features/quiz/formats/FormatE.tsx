import { motion } from 'framer-motion'
import type { Question, QuestionHotspot } from '../../../types'

interface Props {
  question:       Question
  onAnswer:       (id: string) => void
  isAnswered:     boolean
  correctAnswer:  string
  selectedAnswer: string | null
  avatarColor:    string
}

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'az-AZ'
  window.speechSynthesis.speak(u)
}

function hotspotState(
  hs: QuestionHotspot,
  selectedAnswer: string | null,
  correctAnswer: string,
  isAnswered: boolean,
): 'idle' | 'correct' | 'wrong' | 'dim' {
  if (!isAnswered) return 'idle'
  if (hs.id === correctAnswer) return 'correct'
  if (hs.id === selectedAnswer) return 'wrong'
  return 'dim'
}

export default function FormatE({ question, onAnswer, isAnswered, correctAnswer, selectedAnswer, avatarColor }: Props) {
  const hotspots = question.hotspots ?? []

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Question + audio */}
      <div className="flex items-center gap-2">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-bold text-xl text-center"
        >
          {question.text}
        </motion.p>
        <button
          onClick={() => speak(question.text)}
          className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-base shrink-0"
          aria-label="Sualı dinlə"
        >
          🔊
        </button>
      </div>

      {/* Image container with hotspots */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full aspect-square max-w-xs rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(17,24,39,0.9), rgba(31,41,55,0.9))`,
          border:     `2px solid ${avatarColor}40`,
          boxShadow:  `0 0 40px ${avatarColor}20`,
        }}
      >
        {/* Background emoji as illustration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[120px] opacity-20 select-none">{question.emoji ?? '🖼️'}</span>
        </div>

        {/* Hotspot buttons */}
        {hotspots.map((hs, i) => {
          const state = hotspotState(hs, selectedAnswer, correctAnswer, isAnswered)

          const ringColor = state === 'correct' ? '#22C55E'
                          : state === 'wrong'   ? '#EF4444'
                          : state === 'idle'    ? avatarColor
                          : 'rgba(255,255,255,0.15)'

          const bgColor = state === 'correct' ? 'rgba(34,197,94,0.3)'
                        : state === 'wrong'   ? 'rgba(239,68,68,0.3)'
                        : `${avatarColor}25`

          return (
            <motion.button
              key={hs.id}
              onClick={() => !isAnswered && onAnswer(hs.id)}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={
                state === 'wrong'
                  ? { opacity: 1, scale: 1, x: [0, -8, 8, -6, 6, 0] }
                  : state === 'correct'
                  ? { opacity: 1, scale: [1, 1.3, 1] }
                  : { opacity: state === 'dim' ? 0.35 : 1, scale: 1 }
              }
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={!isAnswered ? { scale: 1.15 } : {}}
              whileTap={!isAnswered ? { scale: 0.9 } : {}}
              disabled={isAnswered && state !== 'correct'}
              className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
              aria-label={hs.label}
            >
              {/* Ring indicator */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 backdrop-blur-sm text-2xl transition-all"
                style={{ borderColor: ringColor, backgroundColor: bgColor }}
              >
                {state === 'correct' ? '✅' : state === 'wrong' ? '❌' : hs.label.split(' ')[0]}
              </div>
              {/* Label */}
              <span
                className="text-[10px] font-bold text-white bg-[rgba(0,0,0,0.7)] px-2 py-0.5 rounded-lg whitespace-nowrap"
                style={{ border: `1px solid ${ringColor}60` }}
              >
                {hs.label}
              </span>
            </motion.button>
          )
        })}

        {/* Correct glow overlay */}
        {isAnswered && selectedAnswer === correctAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 rounded-3xl"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.5), transparent 70%)' }}
          />
        )}
      </motion.div>

      {/* Hint text */}
      {!isAnswered && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[#9CA3AF] text-xs text-center"
        >
          Düzgün cavabın üzərinə toxun
        </motion.p>
      )}
    </div>
  )
}
