import { useState, useRef, useEffect, type FormEvent } from 'react'
import type { ChatMessage } from '../../types'

interface Props {
  messages:      ChatMessage[]
  currentUserId: string
  otherName:     string
  isLoading:     boolean
  isSending:     boolean
  onSend:        (content: string) => void
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageThread({
  messages, currentUserId, otherName, isLoading, isSending, onSend,
}: Props) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Yeni mesaj gələndə ən aşağıya sürüş
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header — qarşı tərəfin adı */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <p className="font-semibold text-white">{otherName}</p>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center pt-10">
            <div className="w-8 h-8 rounded-full border-4 border-white/10 border-t-white/60 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-white/30 text-sm pt-10">İlk mesajı sən yaz 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    mine
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm break-words whitespace-pre-wrap">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-200' : 'text-white/40'}`}>
                    {msgTime(m.sentAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Yazı qutusu */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 shrink-0 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white
                     placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || isSending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white rounded-xl px-5 text-sm font-medium transition-colors"
        >
          Göndər
        </button>
      </form>

    </div>
  )
}
