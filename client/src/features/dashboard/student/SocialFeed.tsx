import { motion } from 'framer-motion'

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

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-5">
        <span className="text-3xl">📡</span>
        <p className="text-[#9CA3AF] text-xs leading-relaxed max-w-[220px]">
          Hələ hadisə yoxdur. Dostların aktivliyi və nailiyyətləri burada görünəcək.
        </p>
      </div>
    </motion.div>
  )
}
