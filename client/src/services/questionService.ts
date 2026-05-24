import api from '../lib/api'
import type { Question, AnswerResponse, AgeGroup } from '../types'

const source = (import.meta as { env: Record<string, string> }).env.VITE_QUESTION_SOURCE ?? 'database'

// ── Mock data (used when API not ready or source=mock) ────────────────────

const MOCK_QUESTIONS: Question[] = [
  {
    _id: 'mock-1',
    text: 'Azərbaycanın paytaxtı hansı şəhərdir?',
    emoji: '🏙️',
    format: 'A',
    options: [
      { id: 'a', text: 'Bakı',   emoji: '🏙️' },
      { id: 'b', text: 'Gəncə', emoji: '🏛️' },
      { id: 'c', text: 'Şəki',  emoji: '🌲' },
    ],
    correctAnswer: 'a',
    subject:  'Coğrafiya',
    ageGroups: ['9-11', '12-14', '15-17'],
    xpReward: 10,
    timeLimit: 30,
  },
  {
    _id: 'mock-2',
    text: '7 × 8 = ?',
    emoji: '🔢',
    format: 'B',
    options: [
      { id: 'a', text: '54', emoji: '🔴' },
      { id: 'b', text: '56', emoji: '🔵' },
      { id: 'c', text: '64', emoji: '🟡' },
      { id: 'd', text: '48', emoji: '🟢' },
    ],
    correctAnswer: 'b',
    subject:  'Riyaziyyat',
    ageGroups: ['6-8', '9-11', '12-14'],
    xpReward: 10,
    timeLimit: 20,
  },
  {
    _id: 'mock-3',
    text: 'Nil çayı dünyanın ən uzun çayıdır.',
    emoji: '🌊',
    format: 'C',
    options: [
      { id: 'true',  text: 'Doğru',  emoji: '✅' },
      { id: 'false', text: 'Yanlış', emoji: '❌' },
    ],
    correctAnswer: 'true',
    subject:  'Coğrafiya',
    ageGroups: ['9-11', '12-14', '15-17'],
    xpReward: 10,
    timeLimit: 25,
  },
  {
    _id: 'mock-4',
    text: 'Boşluğu düzgün söz ilə doldurun:',
    emoji: '✍️',
    format: 'D',
    options: [],
    correctAnswer: 'Azərbaycanın',
    subject: 'Azərbaycan dili',
    ageGroups: ['9-11', '12-14', '15-17'],
    xpReward: 15,
    timeLimit: 35,
    blankSentence: 'Bakı ___ paytaxtıdır.',
    wordChoices:   ['Azərbaycanın', 'Türkiyənin', 'Gürcüstanın', 'Rusiyanın'],
  },
  {
    _id: 'mock-5',
    text: 'Hansı heyvan meşədə yaşayır?',
    emoji: '🌲',
    format: 'E',
    options: [],
    correctAnswer: 'wolf',
    subject: 'Biologiya',
    ageGroups: ['6-8', '9-11', '12-14'],
    xpReward: 10,
    timeLimit: 30,
    hotspots: [
      { id: 'wolf',  x: 18, y: 45, label: '🐺 Canavar', isCorrect: true  },
      { id: 'fish',  x: 52, y: 68, label: '🐟 Balıq',   isCorrect: false },
      { id: 'camel', x: 78, y: 42, label: '🐪 Dəvə',    isCorrect: false },
    ],
  },
]

// ── AI placeholder ────────────────────────────────────────────────────────

async function fetchFromAI(_ageGroup?: AgeGroup): Promise<Question[]> {
  // Future: call OpenAI endpoint
  console.warn('[questionService] AI source not yet implemented — using mock data')
  return MOCK_QUESTIONS
}

// ── Database source ───────────────────────────────────────────────────────

async function fetchFromDatabase(): Promise<Question[]> {
  try {
    const res = await api.get<{ data: Question[] }>('/daily')
    return res.data.data
  } catch {
    return MOCK_QUESTIONS
  }
}

// ── Public service ────────────────────────────────────────────────────────

export const questionService = {
  async fetchDaily(ageGroup?: AgeGroup): Promise<Question[]> {
    if (source === 'ai') return fetchFromAI(ageGroup)
    return fetchFromDatabase()
  },

  async submitAnswer(
    questionId:   string,
    answer:       string,
    responseTime: number,
  ): Promise<AnswerResponse> {
    try {
      const res = await api.post<{ data: AnswerResponse }>('/daily/answer', {
        questionId,
        answer,
        responseTime,
      })
      return res.data.data
    } catch {
      // Offline fallback: compute locally from mock
      const q = MOCK_QUESTIONS.find(q => q._id === questionId)
      const correct = !!q && answer === q.correctAnswer
      return {
        correct,
        xpEarned:      correct ? (q?.xpReward ?? 10) : 0,
        newStreak:     0,
        heartsLeft:    5,
        correctAnswer: q?.correctAnswer ?? '',
      }
    }
  },
}
