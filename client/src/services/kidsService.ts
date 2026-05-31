import api from '../lib/api'
import { API_ROUTES } from '../constants'
import type {
  KidsCategory,
  KidsVideo,
  KidsProgressItem,
  KidsAnswerResult,
} from '../types'

export const kidsService = {
  // Bütün kateqoriyalar (kateqoriya gridi üçün) — backend hardcoded qaytarır
  async getCategories(): Promise<KidsCategory[]> {
    const res = await api.get<{ data: KidsCategory[] }>(API_ROUTES.KIDS.CATEGORIES)
    return res.data.data
  },

  // Videolar — kateqoriya və yaş qrupu ilə filtr (hər ikisi opsionaldır)
  async getVideos(params?: { category?: string; ageGroup?: string }): Promise<KidsVideo[]> {
    const res = await api.get<{ data: KidsVideo[] }>(API_ROUTES.KIDS.VIDEOS, { params })
    return res.data.data
  },

  // Tək video (player səhifəsi açılanda)
  async getVideoById(id: string): Promise<KidsVideo> {
    const res = await api.get<{ data: KidsVideo }>(API_ROUTES.KIDS.BY_ID(id))
    return res.data.data
  },

  // Baxış sayğacını artır (player açılan kimi, fire-and-forget)
  async incrementView(id: string): Promise<void> {
    await api.post(API_ROUTES.KIDS.VIEW(id))
  },

  // Videonu bitir → +10 XP
  async complete(id: string): Promise<{ xpEarned: number }> {
    const res = await api.post<{ data: { xpEarned: number } }>(API_ROUTES.KIDS.COMPLETE(id))
    return res.data.data
  },

  // Quiz sualına cavab ver → doğru/səhv + XP
  async answer(id: string, questionIndex: number, answer: number): Promise<KidsAnswerResult> {
    const res = await api.post<{ data: KidsAnswerResult }>(
      API_ROUTES.KIDS.ANSWER(id),
      { questionIndex, answer },
    )
    return res.data.data
  },

  // Mənim irəliləyişim (hansı videoları bitirmişəm, neçə XP)
  async getMyProgress(): Promise<KidsProgressItem[]> {
    const res = await api.get<{ data: KidsProgressItem[] }>(API_ROUTES.KIDS.MY_PROGRESS)
    return res.data.data
  },
}
