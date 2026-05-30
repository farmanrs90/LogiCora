import api from '../lib/api'
import { API_ROUTES } from '../constants'
import type { Conversation, ConversationDetail, ChatMessage,ChatParticipant } from '../types'

export const chatService = {
  // Mənim bütün söhbətlərim (sol panel siyahısı)
  async getConversations(): Promise<Conversation[]> {
    const res = await api.get<{ data: Conversation[] }>(API_ROUTES.CHAT.LIST)
    return res.data.data
  },
    // Mesajlaşa biləcəyim istifadəçiləri axtar (boş query → hamısı)
  async searchUsers(query: string): Promise<ChatParticipant[]> {
    const res = await api.get<{ data: ChatParticipant[] }>(API_ROUTES.CHAT.SEARCH, {
      params: { q: query },
    })
    return res.data.data
  },


  // Bir user ilə söhbət aç (varsa tapır, yoxsa yaradır)
  async startWith(userId: string): Promise<Conversation> {
    const res = await api.post<{ data: Conversation }>(API_ROUTES.CHAT.START(userId))
    return res.data.data
  },

  // Bir söhbətin bütün mesajları (sağ panel açılanda)
  async getMessages(conversationId: string): Promise<ConversationDetail> {
    const res = await api.get<{ data: ConversationDetail }>(API_ROUTES.CHAT.MESSAGES(conversationId))
    return res.data.data
  },

  // Mesaj göndər — backend yeni mesaj obyektini qaytarır
  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const res = await api.post<{ data: { message: ChatMessage; conversationId: string } }>(
      API_ROUTES.CHAT.SEND(conversationId),
      { content },
    )
    return res.data.data.message
  },

  // Qarşı tərəfin mesajlarını "oxundu" işarələ
  async markAsRead(conversationId: string): Promise<void> {
    await api.patch(API_ROUTES.CHAT.READ(conversationId))
  },
}
