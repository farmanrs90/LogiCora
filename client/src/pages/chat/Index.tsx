import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import { chatService } from '../../services/chatService'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'
import NewChatModal from './NewChatModal'
import type { Conversation, ConversationDetail } from '../../types'

// Socket "message:receive" payload-ı (server.js-dən)
interface IncomingMessage {
  conversationId: string
  senderId: string
  content: string
  sentAt: string
}

export default function Chat() {
  const { user } = useAuth()
  const currentUserId = user?._id ?? ''
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)

  // selectedId-nin son dəyərini socket handler-də stale olmadan oxumaq üçün
  const selectedIdRef = useRef<string | null>(null)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // Socket — bütün chat səhifəsi boyu bir dəfə qoşulur (roomId = user._id, stabil)
  const { socketRef, isConnected, emit } = useSocket(currentUserId || null)

  // ── Söhbət siyahısı ──────────────────────────────────────────────
  const { data: conversations = [] } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatService.getConversations,
  })

  // ── Seçilmiş söhbətin mesajları ──────────────────────────────────
  const { data: detail, isLoading: msgsLoading } = useQuery<ConversationDetail>({
    queryKey: ['chat', 'messages', selectedId],
    queryFn: () => chatService.getMessages(selectedId!),
    enabled: !!selectedId,
  })

  // ── Mesaj göndər ─────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(selectedId!, content),
    onSuccess: (newMsg) => {
      // 1) Öz ekranıma dərhal əlavə et (cache)
      qc.setQueryData<ConversationDetail>(['chat', 'messages', selectedId], (old) =>
        old ? { ...old, messages: [...old.messages, newMsg] } : old,
      )
      // 2) Qarşı tərəfə socket ilə xəbər ver
      emit('message:send', { conversationId: selectedId, content: newMsg.content })
      // 3) Sol siyahıda "son mesaj" yenilənsin
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })

  // ── Söhbət açılanda: oxundu işarələ ──────────────────────────────
  const handleSelect = (c: Conversation) => {
    setSelectedId(c._id)
    chatService.markAsRead(c._id).catch(() => { })
  }

  // Qoşulanda / söhbət dəyişəndə chat room-una daxil ol
  useEffect(() => {
    if (isConnected && selectedId) emit('chat:join', { conversationId: selectedId })
  }, [isConnected, selectedId, emit])

  // ── Real-time: qarşı tərəfdən mesaj gəldikdə ─────────────────────
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handler = (payload: IncomingMessage) => {
      // Sol siyahını həmişə təzələ (son mesaj + sıralama)
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })

      // Yalnız açıq olan söhbətə aiddirsə ekrana əlavə et
      if (payload.conversationId !== selectedIdRef.current) return
      qc.setQueryData<ConversationDetail>(['chat', 'messages', payload.conversationId], (old) =>
        old ? {
          ...old,
          messages: [...old.messages, {
            _id: `rt-${Date.now()}`,   // real-time mesaj — backend _id-si yoxdur
            senderId: payload.senderId,
            content: payload.content,
            sentAt: payload.sentAt,
            readAt: null,
          }],
        } : old,
      )
    }

    socket.on('message:receive', handler)
    return () => { socket.off('message:receive', handler) }
  }, [isConnected, socketRef, qc])

  // Header üçün qarşı tərəfin adı (siyahıdan, yoxsa açıq söhbətin detalından)
  const selectedConv = conversations.find((c) => c._id === selectedId)
  const participants = selectedConv?.participants ?? detail?.participants ?? []
  const other = participants.find((p) => p._id !== currentUserId)
  const otherName = other ? `${other.name} ${other.surname}` : ''

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] bg-[#0D0D0D] text-white flex overflow-hidden">

      {/* Sol panel — söhbətlər */}
      <aside className="w-80 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-lg font-bold">Mesajlar</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white
                       flex items-center justify-center text-lg leading-none transition-colors"
            title="Yeni söhbət"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            currentUserId={currentUserId}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      {/* Sağ panel — thread və ya boş hal */}
      <main className="flex-1 min-w-0">
        {selectedId ? (
          <MessageThread
            messages={detail?.messages ?? []}
            currentUserId={currentUserId}
            otherName={otherName}
            isLoading={msgsLoading}
            isSending={sendMutation.isPending}
            onSend={(content) => sendMutation.mutate(content)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-white/60">Söhbət seç və ya yenisini başla</p>
          </div>
        )}
      </main>

      {/* Yeni söhbət modalı */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStarted={(conversation) => {
            qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
            setSelectedId(conversation._id)
            setShowNewChat(false)
          }}
        />
      )}

    </div>
  )
}
