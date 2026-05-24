import { motion } from 'framer-motion'
import type { Question } from '../../../types'

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

export default function FormatC({ question, onAnswer, isAnswered, correctAnswer, selectedAnswer, avatarColor }: Props) {
  function sideState(id: 'true' | 'false'): 'idle' | 'correct' | 'wrong' | 'dim' {
    if (!isAnswered) return 'idle'
    if (id === correctAnswer) return 'correct'
    if (id === selectedAnswer) return 'wrong'
    return 'dim'
  }

  const trueState  = sideState('true')
  const falseState = sideState('false')

  function sideStyle(state: 'idle' | 'correct' | 'wrong' | 'dim', base: string) {
    const opacity = state === 'dim' ? 0.3 : 1
    let bg = base
    if (state === 'correct') bg = 'rgba(34,197,94,0.85)'
    if (state === 'wrong')   bg = 'rgba(239,68,68,0.85)'
    return { background: bg, opacity }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full h-full px-4">
      {/* Floating question card */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm mx-auto rounded-3xl p-5 text-center"
        style={{
          background:  'rgba(17,24,39,0.95)',
          border:      `2px solid ${avatarColor}60`,
          boxShadow:   `0 0 40px ${avatarColor}30`,
        }}
      >
        {question.emoji && (
          <motion.div
            className="text-5xl mb-3"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {question.emoji}
          </motion.div>
        )}
        <p className="text-white font-bold text-xl leading-snug">{question.text}</p>
        <button
          onClick={() => speak(question.text)}
          className="mt-3 w-9 h-9 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-base mx-auto"
          aria-label="Sualı dinlə"
        >
          🔊
        </button>
      </motion.div>

      {/* Split buttons */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {/* TRUE */}
        <motion.button
          onClick={() => !isAnswered && onAnswer('true')}
          initial={{ opacity: 0, x: -30 }}
          animate={
            trueState === 'wrong'
              ? { opacity: 1, x: [0, -10, 10, -8, 8, 0] }
              : { opacity: sideState('true') === 'dim' ? 0.3 : 1, x: 0 }
          }
          transition={{ duration: 0.35 }}
          whileHover={!isAnswered ? { scale: 1.04 } : {}}
          whileTap={!isAnswered ? { scale: 0.96 } : {}}
          disabled={isAnswered}
          className="rounded-3xl flex flex-col items-center justify-center gap-3 p-6 min-h-[140px] font-black text-white text-2xl"
          style={sideStyle(trueState, 'rgba(34,197,94,0.35)')}
          aria-label="Doğru"
        >
          <span className="text-5xl">✅</span>
          <span>Doğru</span>
        </motion.button>

        {/* FALSE */}
        <motion.button
          onClick={() => !isAnswered && onAnswer('false')}
          initial={{ opacity: 0, x: 30 }}
          animate={
            falseState === 'wrong'
              ? { opacity: 1, x: [0, -10, 10, -8, 8, 0] }
              : { opacity: sideState('false') === 'dim' ? 0.3 : 1, x: 0 }
          }
          transition={{ duration: 0.35 }}
          whileHover={!isAnswered ? { scale: 1.04 } : {}}
          whileTap={!isAnswered ? { scale: 0.96 } : {}}
          disabled={isAnswered}
          className="rounded-3xl flex flex-col items-center justify-center gap-3 p-6 min-h-[140px] font-black text-white text-2xl"
          style={sideStyle(falseState, 'rgba(239,68,68,0.35)')}
          aria-label="Yanlış"
        >
          <span className="text-5xl">❌</span>
          <span>Yanlış</span>
        </motion.button>
      </div>
    </div>
  )
}
