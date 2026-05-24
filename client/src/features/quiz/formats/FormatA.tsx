import { motion } from 'framer-motion'
import type { Question, AgeGroup } from '../../../types'

interface Props {
  question:       Question
  onAnswer:       (id: string) => void
  isAnswered:     boolean
  correctAnswer:  string
  selectedAnswer: string | null
  avatarColor:    string
  ageGroup?:      AgeGroup
  isSpecialNeeds?: boolean
}

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'az-AZ'
  window.speechSynthesis.speak(u)
}

function cardState(
  optionId:      string,
  selectedAnswer: string | null,
  correctAnswer:  string,
  isAnswered:     boolean,
): 'idle' | 'correct' | 'wrong' | 'dim' {
  if (!isAnswered) return 'idle'
  if (optionId === correctAnswer) return 'correct'
  if (optionId === selectedAnswer) return 'wrong'
  return 'dim'
}

export default function FormatA({ question, onAnswer, isAnswered, correctAnswer, selectedAnswer, avatarColor, ageGroup, isSpecialNeeds }: Props) {
  const isChild = ageGroup === '3-5' || ageGroup === '6-8'
  const btnSize = isChild || isSpecialNeeds ? 'py-5 text-lg' : 'py-3.5 text-sm'
  const emojiSize = isChild ? 'text-7xl' : 'text-5xl'

  // Show max 3 options for children, up to 4 for others
  const displayOptions = isChild ? question.options.slice(0, 3) : question.options

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Emoji / illustration */}
      {question.emoji && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={emojiSize}
        >
          {question.emoji}
        </motion.div>
      )}

      {/* Question text + audio */}
      <div className="flex items-start gap-3 w-full">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`flex-1 text-white font-bold text-center leading-snug ${isChild ? 'text-2xl' : 'text-xl'}`}
        >
          {question.text}
        </motion.p>
        <button
          onClick={() => speak(question.text)}
          className={`shrink-0 rounded-full flex items-center justify-center
                      bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)]
                      transition-colors ${isChild || isSpecialNeeds ? 'w-12 h-12 text-2xl' : 'w-9 h-9 text-base'}`}
          aria-label="Sualı dinlə"
        >
          🔊
        </button>
      </div>

      {/* Answer cards */}
      <div className="flex flex-col gap-3 w-full">
        {displayOptions.map((opt, i) => {
          const state = cardState(opt.id, selectedAnswer, correctAnswer, isAnswered)
          const borderColor = state === 'correct' ? '#22C55E'
                            : state === 'wrong'   ? '#EF4444'
                            : state === 'dim'     ? 'rgba(255,255,255,0.06)'
                            : avatarColor

          const bg = state === 'correct' ? 'rgba(34,197,94,0.15)'
                   : state === 'wrong'   ? 'rgba(239,68,68,0.15)'
                   : state === 'dim'     ? 'rgba(255,255,255,0.03)'
                   : 'rgba(255,255,255,0.06)'

          return (
            <motion.button
              key={opt.id}
              onClick={() => !isAnswered && onAnswer(opt.id)}
              initial={{ opacity: 0, x: 24 }}
              animate={
                state === 'wrong'
                  ? { opacity: 1, x: [0, -10, 10, -8, 8, 0] }
                  : state === 'correct'
                  ? { opacity: 1, x: 0, scale: [1, 1.04, 1] }
                  : { opacity: 1, x: 0 }
              }
              transition={{ delay: i * 0.07, duration: state === 'wrong' ? 0.4 : 0.35 }}
              whileHover={!isAnswered ? { y: -3, boxShadow: `0 8px 24px ${avatarColor}40` } : {}}
              whileTap={!isAnswered ? { scale: 0.97 } : {}}
              disabled={isAnswered}
              className={`w-full flex items-center gap-4 px-5 rounded-2xl font-semibold text-white
                          border-2 transition-colors ${btnSize}`}
              style={{ backgroundColor: bg, borderColor }}
              aria-label={opt.text}
            >
              {opt.emoji && <span className="text-xl shrink-0">{opt.emoji}</span>}
              <span className="flex-1 text-left">{opt.text}</span>
              {state === 'correct' && <span className="text-lg">✅</span>}
              {state === 'wrong'   && <span className="text-lg">❌</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
