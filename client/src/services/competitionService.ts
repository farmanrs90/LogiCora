import api from '../lib/api'
import { API_ROUTES } from '../constants'

// Backend Question (yalnız lazım olan sahələr)
export interface RawQuestion {
  _id:     string
  text:    string
  subject: string
}

export const competitionService = {
  // Sual hovuzu — müəllim yarış qurmaq üçün (envelope YOX, birbaşa array)
  async fetchQuestions(subject?: string): Promise<RawQuestion[]> {
    const res = await api.get<RawQuestion[]>('/questions', {
      params: subject ? { subject } : undefined,
    })
    return res.data
  },

  // Müəllim: yarış yarat → {success, data}
  async create(title: string, questionIds: string[]) {
    const res = await api.post(API_ROUTES.COMPETITIONS.CREATE, {
      title,
      questions: questionIds.map((id) => ({ questionId: id, timeLimit: 20 })),
    })
    return res.data.data
  },

  // Tələbə: PIN ilə qoşul → {success, data}
  async joinByPin(pin: string) {
    const res = await api.post(API_ROUTES.COMPETITIONS.JOIN(pin), {})
    return res.data.data
  },
}
