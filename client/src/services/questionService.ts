import api from '../lib/api'
import { API_ROUTES } from '../constants'
import type { Question, AnswerResponse, AgeGroup, QuestionFormat } from '../types'

// ── Backend formatları ────────────────────────────────────────────────────

interface BackendOption { label: string; text: string }

interface BackendQuestion {
  _id:        string
  text:       string
  type:       string
  options:    BackendOption[]
  subject:    string
  grade:      number
  difficulty: string
  points:     number
  tags?:      string[]
}

interface BackendAnswerResult {
  isCorrect:     boolean
  correctAnswer: string
  xpEarned:      number
  heartLost:     boolean
  heartsLeft:    number
  streak:        number
  totalXP:       number
  level:         number
}

// type → vizual format (DB sualları seçim əsaslıdır → A; sonra genişləndirilə bilər)
function formatFromType(type: string): QuestionFormat {
  if (type === 'true_false') return 'C'
  return 'A'
}

// Backend sualını frontend Question formatına çevir
function mapQuestion(q: BackendQuestion): Question {
  return {
    _id:           q._id,
    text:          q.text,
    format:        formatFromType(q.type),
    // option.id = backend label ("A"/"B"...) → cavab backend correctAnswer ilə uyğun gəlir
    options:       (q.options ?? []).map((o) => ({ id: o.label, text: o.text })),
    correctAnswer: '', // backend GET-də gizlədir; cavabdan sonra serverdən gəlir
    subject:       q.subject,
    ageGroups:     [],
    xpReward:      q.points ?? 10,
    timeLimit:     30,
  }
}

export const questionService = {
  // Backend token-dəki user-in yaşına görə sualları özü seçir
  async fetchDaily(_ageGroup?: AgeGroup): Promise<Question[]> {
    void _ageGroup
    const res = await api.get<{ data: { questions: BackendQuestion[] } }>(API_ROUTES.DAILY.GET)
    const questions = res.data.data?.questions ?? []
    return questions.map(mapQuestion)
  },

  async submitAnswer(
    questionId:    string,
    answer:        string,
    _responseTime: number, // daily-də istifadə olunmur (validation naməlum açarı rədd edir)
  ): Promise<AnswerResponse> {
    void _responseTime
    const normalizedQuestionId = typeof questionId === 'string' ? questionId.trim() : ''
    const normalizedAnswer = typeof answer === 'string' ? answer.trim() : ''

    if (!normalizedQuestionId) {
      throw new Error('questionId tələb olunur.')
    }

    if (!normalizedAnswer) {
      throw new Error('Cavab boş ola bilməz.')
    }

    const res = await api.post<{ data: BackendAnswerResult }>(API_ROUTES.DAILY.ANSWER, {
      questionId: normalizedQuestionId,
      answer: normalizedAnswer,
    })
    const d = res.data.data
    return {
      correct:       d.isCorrect,
      xpEarned:      d.xpEarned,
      newStreak:     d.streak,
      heartsLeft:    d.heartsLeft,
      correctAnswer: d.correctAnswer,
    }
  },
}
