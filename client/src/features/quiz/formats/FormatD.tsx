import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question } from '../../../types'

interface Props {
  question:       Question
  onAnswer:       (word: string) => void
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

export default function FormatD({ question, onAnswer, isAnswered, correctAnswer, selectedAnswer, avatarColor }: Props) {
  const [filled, setFilled] = useState<string | null>(null)

  const sentence = question.blankSentence ?? '___'
  const parts    = sentence.split('___')
  const words    = question.wordChoices ?? []

  function handleWordClick(word: string) {
    if (isAnswered) return
    setFilled(word)
    onAnswer(word)
  }

  function handleClear() {
    if (isAnswered) return
    setFilled(null)
  }

  const blankState = isAnswered
    ? (selectedAnswer === correctAnswer ? 'correct' : 'wrong')
    : filled
    ? 'filled'
    : 'empty'

  const blankBorder = blankState === 'correct' ? '#22C55E'
                    : blankState === 'wrong'   ? '#EF4444'
                    : blankState === 'filled'  ? avatarColor
                    : 'rgba(255,255,255,0.3)'

  const blankBg = blankState === 'correct' ? 'rgba(34,197,94,0.15)'
                : blankState === 'wrong'   ? 'rgba(239,68,68,0.15)'
                : blankState === 'filled'  ? `${avatarColor}15`
                : 'rgba(255,255,255,0.06)'

  return (
    <div className="flex flex-col items-center gap-7 w-full max-w-lg mx-auto px-4">
      {/* Emoji + heading */}
      {question.emoji && (
        <motion.div
          className="text-5xl"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260 }}
        >
          {question.emoji}
        </motion.div>
      )}

      {/* Question title + audio */}
      <div className="flex items-center gap-2">
        <p className="text-white font-bold text-xl">{question.text}</p>
        <button
          onClick={() => speak(question.text + ' ' + sentence.replace('___', '...'))}
          className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-base"
          aria-label="Sualı dinlə"
        >
          🔊
        </button>
      </div>

      {/* Sentence with blank */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-white text-2xl font-bold text-center leading-relaxed flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
      >
        {parts[0] && <span>{parts[0].trim()}</span>}

        {/* Blank slot */}
        <motion.button
          onClick={filled && !isAnswered ? handleClear : undefined}
          animate={blankState === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          className="inline-flex items-center justify-center min-w-[140px] h-10 rounded-xl border-2
                     px-4 text-base font-bold transition-colors"
          style={{ borderColor: blankBorder, backgroundColor: blankBg, color: '#FFFFFF' }}
          aria-label="Boşluq"
        >
          <AnimatePresence mode="wait">
            {filled ? (
              <motion.span
                key={filled}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filled}
                {!isAnswered && <span className="ml-2 text-xs opacity-60">✕</span>}
              </motion.span>
            ) : (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-[#9CA3AF] tracking-widest"
              >
                _ _ _
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {parts[1] && <span>{parts[1].trim()}</span>}

        {/* Correct answer shown after wrong */}
        {isAnswered && selectedAnswer !== correctAnswer && (
          <span className="text-[#22C55E] text-sm">({correctAnswer})</span>
        )}
      </motion.div>

      {/* Word choices */}
      <div className="flex flex-wrap justify-center gap-3 w-full">
        {words.map((word, i) => {
          const isSelected = filled === word
          const isDisabled = isAnswered || (!!filled && !isSelected)

          return (
            <motion.button
              key={word}
              onClick={() => !isDisabled && handleWordClick(word)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: isDisabled ? 0.35 : 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={!isDisabled ? { scale: 1.06, y: -2 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              disabled={isDisabled}
              className="px-5 py-2.5 rounded-xl border-2 font-semibold text-sm text-white transition-all"
              style={{
                borderColor:     isSelected ? avatarColor : 'rgba(255,255,255,0.15)',
                backgroundColor: isSelected ? `${avatarColor}20` : 'rgba(255,255,255,0.06)',
              }}
            >
              {word}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
