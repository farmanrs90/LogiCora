import { motion } from 'framer-motion'

interface FeedItem {
  id:        string
  user:      string
  color:     string
  action:    string
  detail:    string
  xp?:       number
  timeAgo:   string
  emoji:     string
}

// Mock social feed data — replace with API when ready
const FEED_ITEMS: FeedItem[] = [
  { id: '1', user: 'Aytən M.',    color: '#9333EA', action: 'Yarışı qazandı',        detail: 'Riyaziyyat Dueli',          xp: 150, timeAgo: '2 dəq',  emoji: '🏆' },
  { id: '2', user: 'Kənan H.',    color: '#3B82F6', action: '7 günlük seriya!',       detail: 'Günlük quiz zolağı',        xp: 50,  timeAgo: '15 dəq', emoji: '🔥' },
  { id: '3', user: 'Nigar Ə.',    color: '#06B6D4', action: 'Yeni kurs tamamladı',   detail: 'Python Əsasları',           xp: 200, timeAgo: '1 saat', emoji: '🎓' },
  { id: '4', user: 'Rauf T.',     color: '#F97316', action: 'Klana qoşuldu',          detail: '⚡ Şimşək Klanı',                  timeAgo: '2 saat', emoji: '🛡️' },
  { id: '5', user: 'Leyla K.',    color: '#EC4899', action: 'Diamond liqa aldı',      detail: 'Liqa yüksəlişi',           xp: 500, timeAgo: '3 saat', emoji: '💎' },
  { id: '6', user: 'Əli S.',      color: '#58CC02', action: 'Mükəmməl nəticə',       detail: '5/5 günlük quiz',           xp: 75,  timeAgo: '5 saat', emoji: '⭐' },
]

const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.35 } },
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-3 rounded-xl transition-colors duration-150
                 hover:bg-[rgba(255,255,255,0.04)]"
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-black
                   text-white text-sm shrink-0"
        style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}50` }}
      >
        {item.user.charAt(0)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white text-sm font-semibold">{item.user}</span>
          <span className="text-[#9CA3AF] text-xs">{item.action}</span>
          <span className="text-base leading-none">{item.emoji}</span>
        </div>
        <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{item.detail}</p>
      </div>

      {/* Right — XP + time */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {item.xp != null && (
          <span className="text-xs font-bold" style={{ color: item.color }}>+{item.xp} XP</span>
        )}
        <span className="text-[#9CA3AF] text-[10px]">{item.timeAgo}</span>
      </div>
    </motion.div>
  )
}

export default function SocialFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
        <span className="text-white font-bold text-sm">Sosial Lent 📡</span>
        <span className="text-[#9CA3AF] text-xs">Son hadisələr</span>
      </div>

      {/* Feed list */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-2"
      >
        {FEED_ITEMS.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </motion.div>
    </motion.div>
  )
}
