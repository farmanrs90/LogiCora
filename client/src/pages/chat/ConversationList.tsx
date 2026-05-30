import type { Conversation, ChatParticipant } from '../../types'

interface Props {
  conversations:  Conversation[]
  selectedId:     string | null
  currentUserId:  string
  onSelect:       (conversation: Conversation) => void
}

// 2 iştirakçıdan "mən olmayan"ı tap — yəni qarşı tərəf
function otherParticipant(c: Conversation, myId: string): ChatParticipant | undefined {
  return c.participants.find((p) => p._id !== myId)
}

// Vaxtı qısa göstər: bu gün → saat, başqa gün → tarix
function shortTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('az', { day: '2-digit', month: '2-digit' })
}

// Ad+soyadın baş hərfləri → avatar üçün
function initials(p?: ChatParticipant): string {
  if (!p) return '?'
  return `${p.name?.[0] ?? ''}${p.surname?.[0] ?? ''}`.toUpperCase()
}

export default function ConversationList({ conversations, selectedId, currentUserId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-white/60 text-sm">Hələ söhbətin yoxdur</p>
        <p className="text-white/30 text-xs mt-1">Bir profildən mesaj yazmağa başla</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/5">
      {conversations.map((c) => {
        const other      = otherParticipant(c, currentUserId)
        const isSelected = c._id === selectedId
        return (
          <button
            key={c._id}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              isSelected ? 'bg-indigo-500/15' : 'hover:bg-white/5'
            }`}
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-indigo-600/30 text-indigo-200 flex items-center justify-center font-semibold shrink-0">
              {initials(other)}
            </div>

            {/* Ad + son mesaj */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {other ? `${other.name} ${other.surname}` : 'Naməlum'}
                </p>
                <span className="text-[11px] text-white/30 shrink-0">{shortTime(c.lastMessageAt)}</span>
              </div>
              <p className="text-xs text-white/40 truncate mt-0.5">
                {c.lastMessage ?? 'Söhbəti başla...'}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
