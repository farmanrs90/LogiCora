import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { chatService } from '../../services/chatService'
import type { Conversation, ChatParticipant } from '../../types'

interface Props {
  onClose:   () => void
  onStarted: (conversation: Conversation) => void
}

const ROLE_LABEL: Record<string, string> = {
  student: 'Tələbə',
  teacher: 'Müəllim',
  parent:  'Valideyn',
}

export default function NewChatModal({ onClose, onStarted }: Props) {
  const [query, setQuery]         = useState('')
  const [debounced, setDebounced] = useState('')

  // Debounce — hər hərfdə deyil, dayananda axtar (serveri yormasın)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: users = [], isLoading } = useQuery<ChatParticipant[]>({
    queryKey: ['chat', 'search', debounced],
    queryFn:  () => chatService.searchUsers(debounced),
  })

  const startMutation = useMutation({
    mutationFn: (userId: string) => chatService.startWith(userId),
    onSuccess:  (conversation) => onStarted(conversation),
  })

  return (
    // Overlay — kənara klik bağlayır
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}   // içəri klik bağlamasın
        className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Yeni söhbət</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Axtarış */}
        <div className="p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad, soyad və ya email ilə axtar..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white
                       placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Nəticələr */}
        <div className="max-h-80 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <p className="text-center text-white/30 text-sm py-6">Axtarılır...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-6">Heç kim tapılmadı</p>
          ) : (
            users.map((u) => (
              <button
                key={u._id}
                onClick={() => startMutation.mutate(u._id)}
                disabled={startMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5
                           text-left transition-colors disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-200 flex items-center
                                justify-center font-semibold shrink-0 text-sm">
                  {(u.name?.[0] ?? '') + (u.surname?.[0] ?? '')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{u.name} {u.surname}</p>
                  <p className="text-xs text-white/40">{ROLE_LABEL[u.role] ?? u.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
