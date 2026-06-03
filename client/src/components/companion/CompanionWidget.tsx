// client/src/components/companion/CompanionWidget.tsx
// Köməkçi (Logi/Cora) — küncdə dost kimi dayanır, klikləyəndə salam/kömək balonu açılır.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector, useDispatch } from 'react-redux'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { getCompanion, COMPANIONS, setCompanionVisibleLS } from '../../lib/companion'
import { setCompanionVisible } from '../../features/theme/themeSlice'
import type { RootState, AppDispatch } from '../../app/store'

// Faza A — kömək seçimləri hələ scripted (Faza B/C/D-də canlanacaq)
const QUICK_ACTIONS: { emoji: string; label: string; soon: string }[] = [
  { emoji: '🧭', label: 'Saytı gəzdir', soon: 'Tezliklə səni saytda gəzdirəcəyəm!' },
  { emoji: '❓', label: 'Sualım var',    soon: 'Tezliklə istənilən sualına cavab verəcəyəm!' },
]

export default function CompanionWidget() {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useAuth()
  const visible = useSelector((s: RootState) => s.theme.companionVisible)
  const [open, setOpen] = useState(false)

  const c = COMPANIONS[getCompanion()]   // seçilmiş köməkçinin emoji/ad/rəng/salamı

  if (!visible) return null               // söndürülübsə — heç nə göstərmə

  const hide = () => {
    dispatch(setCompanionVisible(false))  // canlı yox ol
    setCompanionVisibleLS(false)          // F5-də də sönülü qal
    setOpen(false)
    toast(`${c.emoji} ${c.name} gizləndi. Tənzimləmələrdən geri qaytara bilərsən.`)
  }

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-3">
      {/* Salam / kömək balonu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-72 rounded-2xl border bg-[#141414] p-4 shadow-2xl"
            style={{ borderColor: `${c.color}40` }}
          >
            {/* Başlıq */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{c.emoji}</span>
                <span className="font-bold text-white">{c.name}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white" aria-label="Bağla">
                <X size={18} />
              </button>
            </div>

            {/* Salam mesajı */}
            <p className="text-sm text-white/70 mb-4 leading-relaxed">
              {user?.name ? `Salam, ${user.name}! ` : 'Salam! '}{c.greeting}
            </p>

            {/* Kömək seçimləri */}
            <div className="flex flex-col gap-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => toast(`${a.emoji} ${a.soon}`)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 text-left transition-colors hover:border-white/25"
                >
                  <span>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>

            {/* Gizlət */}
            <button
              onClick={hide}
              className="mt-3 w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Məni gizlət
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating düymə */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-lg"
        style={{ backgroundColor: `${c.color}20`, border: `2px solid ${c.color}`, boxShadow: `0 0 20px ${c.color}55` }}
        aria-label={`${c.name} köməkçi`}
      >
        {c.emoji}
      </motion.button>
    </div>
  )
}
