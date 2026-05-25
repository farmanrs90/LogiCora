import { useState, useEffect, useReducer, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch } from 'react-redux'
import { setAvatarColor } from '../features/theme/themeSlice'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { APP_ROUTES } from '../constants'
import type { AgeGroup } from '../types'
import type { AppDispatch } from '../app/store'

// ── Types ─────────────────────────────────────────────────────────────────

type CharacterType = 'fast-thinker' | 'deep-analyst' | 'creative-explorer'
type GiftPhase = 'idle' | 'shaking' | 'opening' | 'revealed'
type Direction = 1 | -1

interface Answers {
  name: string
  ageGroup: AgeGroup | null
  q1: string
  q2: string
  q3: number
  q4: string
  q5: string
  knowledgeScore: number
  characterType: CharacterType | null
}

type AnswerAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_AGE'; value: AgeGroup }
  | { type: 'SET_Q1'; value: string }
  | { type: 'SET_Q2'; value: string }
  | { type: 'SET_Q3'; value: number }
  | { type: 'SET_Q4'; value: string }
  | { type: 'SET_Q5'; value: string }
  | { type: 'SET_KNOWLEDGE_SCORE'; value: number }
  | { type: 'SET_CHARACTER'; value: CharacterType }

// ── Static data ───────────────────────────────────────────────────────────

const AGE_CARDS: { group: AgeGroup; icon: string; label: string; color: string }[] = [
  { group: '3-5',   icon: '🚀', label: 'Raket dünyası',        color: '#F97316' },
  { group: '6-8',   icon: '🌲', label: 'Sehrli meşə',          color: '#58CC02' },
  { group: '9-11',  icon: '🏙️', label: 'Futuristik şəhər',     color: '#06B6D4' },
  { group: '12-14', icon: '🛸', label: 'Kosmik stansiya',       color: '#9333EA' },
  { group: '15-17', icon: '🌆', label: 'Professional üfüq',     color: '#3B82F6' },
  { group: '18-22', icon: '🎓', label: 'Universitet kampusu',   color: '#EC4899' },
  { group: '23+',   icon: '💼', label: 'Executive dünya',       color: '#ffd700' },
]

const Q2_EMOJIS = [
  { key: '⚡', label: 'Tez qərar', score: 'fast' },
  { key: '🔍', label: 'Araşdır',   score: 'analytical' },
  { key: '👥', label: 'Məsləhət', score: 'creative' },
  { key: '🎯', label: 'Hədəfə bax', score: 'fast' },
  { key: '💪', label: 'Davam et',  score: 'fast' },
  { key: '🧘', label: 'Sakit ol',  score: 'creative' },
]

const CHARACTER_INFO: Record<CharacterType, { emoji: string; label: string; color: string; avatarEmoji: string }> = {
  'fast-thinker':      { emoji: '⚡', label: 'Sürətli Düşünən',  color: '#06B6D4', avatarEmoji: '🦅' },
  'deep-analyst':      { emoji: '🔍', label: 'Dərin Analitik',    color: '#3B82F6', avatarEmoji: '🦉' },
  'creative-explorer': { emoji: '🎨', label: 'Yaradıcı Kəşfçi',  color: '#9333EA', avatarEmoji: '🦋' },
}

const KNOWLEDGE_QUESTIONS: Record<string, { q: string; options: string[]; correct: number }[]> = {
  young: [
    { q: '2 + 3 = ?',              options: ['4', '5', '6', '7'],         correct: 1 },
    { q: 'Hansı heyvan üzür?',     options: ['Pişik', 'Balıq', 'İt', 'Quş'], correct: 1 },
    { q: 'Göyün rəngi nədir?',     options: ['Yaşıl', 'Qırmızı', 'Mavi', 'Sarı'], correct: 2 },
  ],
  middle: [
    { q: '7 × 8 = ?',             options: ['54', '56', '48', '64'],       correct: 1 },
    { q: 'Günəş sistemimizdə neçə planet var?', options: ['7', '8', '9', '10'], correct: 1 },
    { q: 'H₂O nədir?',            options: ['Oksigen', 'Hidrogen', 'Su', 'Duz'], correct: 2 },
  ],
  advanced: [
    { q: '√169 = ?',               options: ['11', '12', '13', '14'],       correct: 2 },
    { q: 'Python hansı növ dildir?', options: ['Kompilyasiya', 'İnterpretasiya', 'Assem.', 'Maşın'], correct: 1 },
    { q: 'DNA dekodlanması hansı orqanellada baş verir?', options: ['Mitoxondria', 'Ribosoma', 'Nüvə', 'Qolci'], correct: 1 },
  ],
}

function getKnowledgeSet(ageGroup: AgeGroup | null) {
  if (!ageGroup) return KNOWLEDGE_QUESTIONS.middle
  if (['3-5', '6-8'].includes(ageGroup)) return KNOWLEDGE_QUESTIONS.young
  if (['9-11', '12-14'].includes(ageGroup)) return KNOWLEDGE_QUESTIONS.middle
  return KNOWLEDGE_QUESTIONS.advanced
}

function getKnowledgeLevel(score: number): 'beginner' | 'intermediate' | 'advanced' {
  if (score <= 1) return 'beginner'
  if (score === 2) return 'intermediate'
  return 'advanced'
}

// ── Character calculation ─────────────────────────────────────────────────

function calculateCharacter(answers: Answers): CharacterType {
  const scores = { fast: 0, analytical: 0, creative: 0 }

  // Q1 — hobby
  if (answers.q1 === '🏊') scores.fast++
  else if (answers.q1 === '♟️') scores.analytical++
  else if (answers.q1 === '🎨') scores.creative++

  // Q2 — problem
  const q2Map: Record<string, keyof typeof scores> = {
    '⚡': 'fast', '🎯': 'fast', '💪': 'fast',
    '🔍': 'analytical',
    '👥': 'creative', '🧘': 'creative',
  }
  if (answers.q2) scores[q2Map[answers.q2] ?? 'analytical']++

  // Q3 — speed slider
  if (answers.q3 >= 65) scores.fast++
  else if (answers.q3 >= 35) scores.analytical++
  else scores.creative++

  // Q4 — learning style
  if (answers.q4 === '🛠️') scores.fast++
  else if (answers.q4 === '📺') scores.creative++

  // Q5 — losing
  if (answers.q5 === '🔥') scores.fast++
  else if (answers.q5 === '🤔') scores.analytical++
  else if (answers.q5 === '😄') scores.creative++

  const winner = (Object.entries(scores) as [keyof typeof scores, number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  if (winner === 'fast') return 'fast-thinker'
  if (winner === 'analytical') return 'deep-analyst'
  return 'creative-explorer'
}

// ── Reducer ───────────────────────────────────────────────────────────────

const initialAnswers: Answers = {
  name: '', ageGroup: null,
  q1: '', q2: '', q3: 50, q4: '', q5: '',
  knowledgeScore: 0, characterType: null,
}

function answersReducer(state: Answers, action: AnswerAction): Answers {
  switch (action.type) {
    case 'SET_NAME':            return { ...state, name: action.value }
    case 'SET_AGE':             return { ...state, ageGroup: action.value }
    case 'SET_Q1':              return { ...state, q1: action.value }
    case 'SET_Q2':              return { ...state, q2: action.value }
    case 'SET_Q3':              return { ...state, q3: action.value }
    case 'SET_Q4':              return { ...state, q4: action.value }
    case 'SET_Q5':              return { ...state, q5: action.value }
    case 'SET_KNOWLEDGE_SCORE': return { ...state, knowledgeScore: action.value }
    case 'SET_CHARACTER':       return { ...state, characterType: action.value }
    default:                    return state
  }
}

// ── Animation variants ────────────────────────────────────────────────────

const slide = {
  enter: (dir: Direction) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.42, ease: 'easeOut' as const } },
  exit:   (dir: Direction) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0, transition: { duration: 0.32, ease: 'easeIn' as const } }),
}

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const popIn = {
  hidden:  { opacity: 0, scale: 0.85, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.45, ease: 'easeOut' as const } },
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-3 pt-8 pb-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="relative flex items-center justify-center">
          <motion.div
            animate={step === n
              ? { scale: 1.35, backgroundColor: '#9333EA' }
              : step > n
              ? { scale: 1,    backgroundColor: '#58CC02' }
              : { scale: 1,    backgroundColor: 'rgba(255,255,255,0.15)' }
            }
            transition={{ duration: 0.3 }}
            className="w-3 h-3 rounded-full"
          />
          {step === n && (
            <motion.div
              className="absolute w-5 h-5 rounded-full border-2 border-[#9333EA]"
              animate={{ opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1 — Name ─────────────────────────────────────────────────────────

function Step1({ answers, dispatch, onNext }: {
  answers: Answers
  dispatch: React.Dispatch<AnswerAction>
  onNext: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-10 text-center px-6 max-w-lg mx-auto">
      {/* Logi mascot */}
      <motion.div
        initial={{ x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' as const }}
        className="flex flex-col items-center gap-2"
      >
        <motion.span
          className="text-7xl"
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
          role="img" aria-label="Logi"
        >
          🤖
        </motion.span>
        <span className="text-xs text-[#3B82F6] font-bold tracking-widest uppercase">Logi</span>
      </motion.div>

      {/* LogiCora logo glow */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-5xl font-black bg-gradient-to-r from-[#3B82F6] via-[#9333EA] to-[#06B6D4]
                   bg-clip-text text-transparent"
        style={{ filter: 'drop-shadow(0 0 24px rgba(147,51,234,0.5))' }}
      >
        LogiCora
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="text-xl text-white font-medium leading-relaxed"
      >
        Salam! Mən LogiCora-yam.
        <br />
        <span className="text-[#9CA3AF]">Adın nədir?</span>
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full"
      >
        <input
          type="text"
          value={answers.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && answers.name.trim() && onNext()}
          placeholder="Adını yaz..."
          className="input text-center text-xl py-4 placeholder:text-[#4B5563]"
          aria-label="Adın"
          autoFocus
        />
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        onClick={onNext}
        disabled={!answers.name.trim()}
        className="btn-purple px-10 py-3 text-lg w-full disabled:opacity-40"
      >
        Davam et →
      </motion.button>
    </div>
  )
}

// ── Step 2 — Age group ────────────────────────────────────────────────────

function Step2({ answers, dispatch, onNext }: {
  answers: Answers
  dispatch: React.Dispatch<AnswerAction>
  onNext: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-8 px-4 max-w-2xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-black text-white">
          Sən hansı{' '}
          <span className="bg-gradient-to-r from-[#F97316] to-[#9333EA] bg-clip-text text-transparent">
            dünyadan
          </span>{' '}
          gəlirsən?
        </h2>
        <p className="text-[#9CA3AF] mt-2">Yaş qrupunu seç</p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full"
      >
        {AGE_CARDS.map((card) => {
          const selected = answers.ageGroup === card.group
          return (
            <motion.button
              key={card.group}
              variants={popIn}
              onClick={() => {
                dispatch({ type: 'SET_AGE', value: card.group })
              }}
              animate={selected
                ? { scale: 1.06, borderColor: card.color, backgroundColor: `${card.color}18` }
                : { scale: 1,    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }
              }
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 cursor-pointer"
              aria-label={`Yaş qrupu: ${card.group}`}
              aria-pressed={selected}
            >
              <span className="text-3xl">{card.icon}</span>
              <span className="text-white font-bold text-sm">{card.group}</span>
              <span className="text-[#9CA3AF] text-xs text-center leading-tight">{card.label}</span>
              {selected && (
                <motion.div
                  layoutId="age-check"
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: card.color }}
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onNext}
        disabled={!answers.ageGroup}
        className="btn-purple px-10 py-3 text-lg w-full max-w-xs disabled:opacity-40"
      >
        Davam et →
      </motion.button>
    </div>
  )
}

// ── Step 3 — Quiz (5 sub-questions) ───────────────────────────────────────

function Step3({ answers, dispatch, onNext }: {
  answers: Answers
  dispatch: React.Dispatch<AnswerAction>
  onNext: () => void
}) {
  const [subStep, setSubStep] = useState(0)
  const [subDir, setSubDir] = useState<Direction>(1)

  function nextSub() {
    if (subStep < 4) {
      setSubDir(1)
      setSubStep((s) => s + 1)
    } else {
      const ct = calculateCharacter(answers)
      dispatch({ type: 'SET_CHARACTER', value: ct })
      onNext()
    }
  }

  const subCanNext = [
    !!answers.q1, !!answers.q2, true, !!answers.q4, !!answers.q5,
  ][subStep]

  return (
    <div className="flex flex-col items-center gap-6 max-w-xl mx-auto w-full px-4">
      {/* Sub-progress dots */}
      <div className="flex gap-2">
        {[0,1,2,3,4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= subStep ? '#9333EA' : 'rgba(255,255,255,0.2)' }}
          />
        ))}
      </div>

      <motion.p
        key={`quiz-label-${subStep}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-[#9CA3AF] font-medium uppercase tracking-widest"
      >
        Sual {subStep + 1} / 5
      </motion.p>

      <AnimatePresence mode="wait" custom={subDir}>
        <motion.div
          key={`quiz-sub-${subStep}`}
          custom={subDir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full flex flex-col items-center gap-6"
        >
          {/* Q1 — 3 hobby cards */}
          {subStep === 0 && (
            <>
              <h2 className="text-2xl font-black text-white text-center">
                Boş vaxtında nə etmək istəyirsən?
              </h2>
              <div className="grid grid-cols-3 gap-4 w-full">
                {[{ icon: '🏊', label: 'Üzmək' }, { icon: '♟️', label: 'Şahmat' }, { icon: '🎨', label: 'Rəsm' }]
                  .map((opt) => (
                    <motion.button
                      key={opt.icon}
                      onClick={() => dispatch({ type: 'SET_Q1', value: opt.icon })}
                      animate={answers.q1 === opt.icon
                        ? { scale: 1.08, borderColor: '#9333EA', backgroundColor: 'rgba(147,51,234,0.15)' }
                        : { scale: 1,    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }
                      }
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 cursor-pointer"
                      aria-label={opt.label}
                      aria-pressed={answers.q1 === opt.icon}
                    >
                      <span className="text-5xl">{opt.icon}</span>
                      <span className="text-white text-sm font-semibold">{opt.label}</span>
                    </motion.button>
                  ))}
              </div>
            </>
          )}

          {/* Q2 — emoji grid */}
          {subStep === 1 && (
            <>
              <h2 className="text-2xl font-black text-white text-center">
                Çətin problemlə üzləşəndə?
              </h2>
              <div className="grid grid-cols-3 gap-3 w-full">
                {Q2_EMOJIS.map((opt) => (
                  <motion.button
                    key={opt.key}
                    onClick={() => dispatch({ type: 'SET_Q2', value: opt.key })}
                    animate={answers.q2 === opt.key
                      ? { scale: 1.08, borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.12)' }
                      : { scale: 1,    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }
                    }
                    whileTap={{ scale: 0.93 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer"
                    aria-label={opt.label}
                    aria-pressed={answers.q2 === opt.key}
                  >
                    <span className="text-3xl">{opt.key}</span>
                    <span className="text-[#9CA3AF] text-xs text-center">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* Q3 — speed slider */}
          {subStep === 2 && (
            <>
              <h2 className="text-2xl font-black text-white text-center">
                Sürəti nə qədər sevirsən?
              </h2>
              <div className="w-full flex flex-col items-center gap-6">
                <div className="flex justify-between w-full text-3xl px-2">
                  <span>🐢</span>
                  <span>🐆</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={answers.q3}
                  onChange={(e) => dispatch({ type: 'SET_Q3', value: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #9333EA ${answers.q3}%, rgba(255,255,255,0.15) ${answers.q3}%)`,
                  }}
                  aria-label="Sürət seçici"
                />
                <div className="flex justify-between w-full text-sm text-[#9CA3AF] px-1">
                  <span>Yavaş</span>
                  <span className="text-white font-bold">{answers.q3}%</span>
                  <span>Sürətli</span>
                </div>
              </div>
            </>
          )}

          {/* Q4 — dramatic split screen */}
          {subStep === 3 && (
            <>
              <h2 className="text-2xl font-black text-white text-center">
                Öyrənmə stilin?
              </h2>
              <div className="grid grid-cols-2 gap-4 w-full h-52">
                {[{ icon: '📺', label: 'İzləyərək öyrənirəm', val: '📺' },
                  { icon: '🛠️', label: 'Edərək öyrənirəm',   val: '🛠️' }]
                  .map((opt) => (
                    <motion.button
                      key={opt.val}
                      onClick={() => dispatch({ type: 'SET_Q4', value: opt.val })}
                      animate={answers.q4 === opt.val
                        ? { scale: 1.04, borderColor: '#58CC02', backgroundColor: 'rgba(88,204,2,0.12)' }
                        : { scale: 1,    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }
                      }
                      whileTap={{ scale: 0.96 }}
                      className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 cursor-pointer h-full"
                      aria-label={opt.label}
                      aria-pressed={answers.q4 === opt.val}
                    >
                      <span className="text-5xl">{opt.icon}</span>
                      <span className="text-white text-sm font-semibold text-center px-3">{opt.label}</span>
                    </motion.button>
                  ))}
              </div>
            </>
          )}

          {/* Q5 — 3 emoji reaction */}
          {subStep === 4 && (
            <>
              <h2 className="text-2xl font-black text-white text-center">
                Yarışda uduzanda nə edərsən?
              </h2>
              <div className="flex gap-4 w-full justify-center">
                {[{ icon: '🔥', label: 'Qəzəblənirsən', val: '🔥' },
                  { icon: '🤔', label: 'Analiz edirsən', val: '🤔' },
                  { icon: '😄', label: 'Gülərsən',       val: '😄' }]
                  .map((opt) => (
                    <motion.button
                      key={opt.val}
                      onClick={() => dispatch({ type: 'SET_Q5', value: opt.val })}
                      animate={answers.q5 === opt.val
                        ? { scale: 1.15, borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,0.15)' }
                        : { scale: 1,    borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }
                      }
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 cursor-pointer flex-1"
                      aria-label={opt.label}
                      aria-pressed={answers.q5 === opt.val}
                    >
                      <span className="text-4xl">{opt.icon}</span>
                      <span className="text-[#9CA3AF] text-xs text-center">{opt.label}</span>
                    </motion.button>
                  ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.button
        onClick={nextSub}
        disabled={!subCanNext}
        className="btn-purple px-10 py-3 text-lg w-full max-w-xs disabled:opacity-40"
      >
        {subStep < 4 ? 'Növbəti →' : 'Nəticəyə bax ✨'}
      </motion.button>
    </div>
  )
}

// ── Step 4 — Knowledge ────────────────────────────────────────────────────

function Step4({ answers, dispatch, onNext }: {
  answers: Answers
  dispatch: React.Dispatch<AnswerAction>
  onNext: () => void
}) {
  const questions = getKnowledgeSet(answers.ageGroup)
  const [qIndex, setQIndex] = useState(0)
  const [score, setScore]   = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [qDir, setQDir] = useState<Direction>(1)

  const current = questions[qIndex]
  const progress = Math.round(((qIndex) / questions.length) * 100)

  function handleAnswer(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const correct = idx === current.correct
    const newScore = correct ? score + 1 : score

    setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setQDir(1)
        setScore(newScore)
        setSelected(null)
        setQIndex((i) => i + 1)
      } else {
        dispatch({ type: 'SET_KNOWLEDGE_SCORE', value: newScore })
        onNext()
      }
    }, 900)
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-lg mx-auto w-full px-4">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-black text-white">Bilik səviyyəni ölçək</h2>
        <p className="text-[#9CA3AF] text-sm mt-1">Sistem özü müəyyən edəcək — rahat ol</p>
      </motion.div>

      {/* Circular progress */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <motion.circle
            cx="36" cy="36" r="30" fill="none"
            stroke="#9333EA" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 30}`}
            animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - progress / 100) }}
            transition={{ duration: 0.4 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{qIndex + 1}/{questions.length}</span>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={qDir}>
        <motion.div
          key={qIndex}
          custom={qDir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full flex flex-col gap-4"
        >
          <p className="text-xl font-bold text-white text-center">{current.q}</p>

          <div className="grid grid-cols-2 gap-3">
            {current.options.map((opt, idx) => {
              const isSelected = selected === idx
              const isCorrect  = idx === current.correct
              let borderColor = 'rgba(255,255,255,0.12)'
              let bgColor     = 'rgba(255,255,255,0.04)'
              if (selected !== null) {
                if (isCorrect)              { borderColor = '#58CC02'; bgColor = 'rgba(88,204,2,0.15)' }
                else if (isSelected)        { borderColor = '#EF4444'; bgColor = 'rgba(239,68,68,0.15)' }
              }

              return (
                <motion.button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  animate={{ borderColor, backgroundColor: bgColor }}
                  whileTap={selected === null ? { scale: 0.97 } : {}}
                  className="p-4 rounded-xl border-2 text-white font-semibold text-sm text-center
                             cursor-pointer disabled:cursor-default"
                  disabled={selected !== null}
                  aria-label={opt}
                >
                  {opt}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Step 5 — Avatar reveal ────────────────────────────────────────────────

const CONFETTI_COLORS = ['#3B82F6', '#9333EA', '#58CC02', '#F97316', '#EC4899', '#06B6D4', '#ffd700']
const CONFETTI_PIECES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  angle: (i / 20) * 360,
  distance: 80 + Math.random() * 80,
  size: 6 + Math.random() * 8,
}))

function Step5({ answers, onDone }: {
  answers: Answers
  onDone: () => void
}) {
  const [phase, setPhase] = useState<GiftPhase>('idle')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shaking'), 600)
    const t2 = setTimeout(() => setPhase('opening'), 2200)
    const t3 = setTimeout(() => setPhase('revealed'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const char = answers.characterType ?? 'creative-explorer'
  const info = CHARACTER_INFO[char]

  return (
    <div className="flex flex-col items-center gap-8 max-w-lg mx-auto w-full px-4 text-center">
      <motion.h2
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black text-white"
      >
        Hazırsan, <span className="bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">{answers.name}</span>?
      </motion.h2>

      {/* Gift box + avatar reveal */}
      <div className="relative h-48 flex items-center justify-center">
        {/* Confetti */}
        <AnimatePresence>
          {phase === 'revealed' && CONFETTI_PIECES.map((piece) => {
            const rad = (piece.angle * Math.PI) / 180
            return (
              <motion.div
                key={piece.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * piece.distance,
                  y: Math.sin(rad) * piece.distance - 40,
                  opacity: 0,
                  scale: 0.3,
                  rotate: piece.angle * 2,
                }}
                transition={{ duration: 1.2, ease: 'easeOut' as const }}
                className="absolute rounded-sm"
                style={{ width: piece.size, height: piece.size, backgroundColor: piece.color }}
              />
            )
          })}
        </AnimatePresence>

        {/* Gift box */}
        <AnimatePresence mode="wait">
          {phase !== 'revealed' && (
            <motion.div
              key="gift"
              exit={{ scale: 0, opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
            >
              <motion.span
                className="text-8xl"
                role="img" aria-label="Hədiyyə qutusu"
                animate={
                  phase === 'shaking'
                    ? { rotate: [-8, 8, -8, 8, -5, 5, 0], x: [-4, 4, -4, 4, 0] }
                    : phase === 'opening'
                    ? { scale: [1, 1.3, 0.9, 1.15], rotate: [0, -10, 10, 0] }
                    : {}
                }
                transition={{ duration: phase === 'shaking' ? 1.2 : 0.5, ease: 'easeInOut' as const }}
              >
                🎁
              </motion.span>
            </motion.div>
          )}

          {phase === 'revealed' && (
            <motion.div
              key="avatar"
              initial={{ y: 60, opacity: 0, scale: 0.5 }}
              animate={{ y: 0,  opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="flex flex-col items-center gap-2"
            >
              {/* Glow ring */}
              <motion.div
                className="relative"
                animate={{ filter: [`drop-shadow(0 0 12px ${info.color})`, `drop-shadow(0 0 28px ${info.color})`, `drop-shadow(0 0 12px ${info.color})`] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center text-6xl border-4"
                  style={{ borderColor: info.color, backgroundColor: `${info.color}18` }}
                >
                  {info.avatarEmoji}
                </div>
              </motion.div>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ color: info.color }} className="text-xl">{info.emoji}</span>
                <span className="text-white font-bold text-lg">{info.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {phase === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <p className="text-[#9CA3AF] text-sm">Bu sənin başlanğıc avatarındır!</p>

            {/* Cora */}
            <div className="flex items-center gap-3 bg-[rgba(147,51,234,0.1)] border border-[rgba(147,51,234,0.25)] rounded-2xl px-5 py-3">
              <span className="text-3xl" role="img" aria-label="Cora">🧙‍♀️</span>
              <p className="text-[#9CA3AF] text-sm text-left">
                <span className="text-[#9333EA] font-bold">Cora: </span>
                Macəran başlayır, {answers.name}! Sənə inanıram! ✨
              </p>
            </div>

            {/* Locked silhouettes */}
            <div className="flex gap-4 items-center justify-center">
              {[
                { xp: 50,  label: 'Form 2' },
                { xp: 200, label: 'Form 3' },
                { xp: 500, label: 'Final' },
              ].map((lock) => (
                <div key={lock.xp} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]
                                  flex items-center justify-center text-xl opacity-50">
                    🔒
                  </div>
                  <span className="text-[#9CA3AF] text-xs">{lock.xp} XP</span>
                  <span className="text-[#6B7280] text-[10px]">{lock.label}</span>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDone}
              className="btn-primary px-10 py-4 text-lg font-bold w-full"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #9333EA)' }}
            >
              🚀 Macəraya başla!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Onboarding ───────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch<AppDispatch>()
  const { user }  = useAuth()

  const [step, setStep]         = useState(1)
  const [direction, setDirection] = useState<Direction>(1)
  const [answers, dispatchA]    = useReducer(answersReducer, initialAnswers)

  function goNext() {
    setDirection(1)
    setStep((s) => s + 1)
  }

  const handleDone = useCallback(async () => {
    if (!answers.characterType) return

    // Set avatar color in theme store
    dispatch(setAvatarColor(CHARACTER_INFO[answers.characterType].color))

    // Send to API
    try {
      await api.post('/auth/complete-onboarding', {
        name:          answers.name,
        ageGroup:      answers.ageGroup,
        characterType: answers.characterType,
        knowledgeLevel: getKnowledgeLevel(answers.knowledgeScore),
      })
    } catch {
      // Non-blocking — proceed regardless
    }

    // Navigate to role dashboard
    const roleRoute: Record<string, string> = {
      student: APP_ROUTES.DASHBOARD.STUDENT,
      teacher: APP_ROUTES.DASHBOARD.TEACHER,
      parent:  APP_ROUTES.DASHBOARD.PARENT,
    }
    navigate(roleRoute[user?.role ?? 'student'] ?? APP_ROUTES.DASHBOARD.STUDENT, { replace: true })
  }, [answers, dispatch, navigate, user])

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col overflow-hidden">
      <ProgressBar step={step} />

      <div className="flex-1 flex items-center justify-center py-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-2xl"
          >
            {step === 1 && <Step1 answers={answers} dispatch={dispatchA} onNext={goNext} />}
            {step === 2 && <Step2 answers={answers} dispatch={dispatchA} onNext={goNext} />}
            {step === 3 && <Step3 answers={answers} dispatch={dispatchA} onNext={goNext} />}
            {step === 4 && <Step4 answers={answers} dispatch={dispatchA} onNext={goNext} />}
            {step === 5 && <Step5 answers={answers} onDone={handleDone} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
