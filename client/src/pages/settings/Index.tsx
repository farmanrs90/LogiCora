import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES } from '../../constants'

interface AccessibilityConfig {
  fontSize:          'sm' | 'md' | 'lg' | 'xl'
  highContrast:      boolean
  audioQuestions:    boolean
  simplifiedUI:      boolean
  noAnimations:      boolean
  largeClickTargets: boolean
  keyboardOnly:      boolean
}

const DEFAULT_CONFIG: AccessibilityConfig = {
  fontSize: 'md',
  highContrast: false,
  audioQuestions: false,
  simplifiedUI: false,
  noAnimations: false,
  largeClickTargets: false,
  keyboardOnly: false,
}

const FONT_SIZES = [
  { value: 'sm' as const, label: 'Kiçik',     px: 14 },
  { value: 'md' as const, label: 'Normal',    px: 16 },
  { value: 'lg' as const, label: 'Böyük',     px: 18 },
  { value: 'xl' as const, label: 'Çox böyük', px: 22 },
]

const TOGGLES: { key: keyof AccessibilityConfig; label: string; desc: string; emoji: string }[] = [
  { key: 'highContrast',      label: 'Yüksək kontrast',  desc: 'Rəngləri daha sezilən et',     emoji: '🌗' },
  { key: 'audioQuestions',    label: 'Sual səsi',         desc: 'Sualları səslə dinlə',         emoji: '🔊' },
  { key: 'simplifiedUI',      label: 'Sadə interfeys',    desc: 'Bəzəkləri azalt',              emoji: '✨' },
  { key: 'noAnimations',      label: 'Animasiyasız',      desc: 'Bütün animasiyaları söndür',   emoji: '🚫' },
  { key: 'largeClickTargets', label: 'Böyük düymələr',    desc: 'Daha böyük klik sahəsi',       emoji: '👆' },
  { key: 'keyboardOnly',      label: 'Yalnız klaviatura', desc: 'Klaviatura naviqasiyası',      emoji: '⌨️' },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-indigo-600' : 'bg-white/15'}`}
      aria-pressed={value}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [local, setLocal] = useState<AccessibilityConfig>(DEFAULT_CONFIG)

  const { data, isLoading } = useQuery<AccessibilityConfig>({
    queryKey: ['accessibility', 'me'],
    queryFn:  () => api.get<{ data: AccessibilityConfig }>(API_ROUTES.ACCESSIBILITY.ME).then(r => r.data.data),
  })

  // Backend-dən gələn config-i local state-ə sinxronla
  useEffect(() => { if (data) setLocal(data) }, [data])

  // Şrift ölçüsünü canlı tətbiq et (bu səhifədə)
  useEffect(() => {
    const px = FONT_SIZES.find(f => f.value === local.fontSize)?.px ?? 16
    document.documentElement.style.fontSize = `${px}px`
  }, [local.fontSize])

  const mutation = useMutation({
    mutationFn: (patch: Partial<AccessibilityConfig>) =>
      api.put<{ data: AccessibilityConfig }>(API_ROUTES.ACCESSIBILITY.UPDATE, patch).then(r => r.data.data),
    onSuccess: (cfg) => {
      qc.setQueryData(['accessibility', 'me'], cfg)
      toast.success('Saxlanıldı')
    },
    onError: () => toast.error('Saxlanmadı'),
  })

  const update = (patch: Partial<AccessibilityConfig>) => {
    setLocal(prev => ({ ...prev, ...patch }))
    mutation.mutate(patch)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-white/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tənzimləmələr</h1>
            <p className="text-white/40 text-sm mt-0.5">Əlçatanlıq və ekran tərcihləri</p>
          </div>
          <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white text-sm">← Geri</button>
        </div>

        {/* Font size */}
        <section className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Şrift ölçüsü</h2>
            <p className="text-white/40 text-xs mt-0.5">Dərhal tətbiq olunur</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => update({ fontSize: opt.value })}
                whileTap={{ scale: 0.96 }}
                className={`py-3 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                  local.fontSize === opt.value
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                    : 'border-white/10 text-white/60 hover:text-white'
                }`}
              >
                <span style={{ fontSize: opt.px, lineHeight: 1 }}>A</span>
                <span className="text-[10px] text-white/50">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Toggles */}
        <section className="bg-[#141414] border border-white/10 rounded-2xl p-5">
          <h2 className="font-semibold mb-1">Əlçatanlıq</h2>
          <p className="text-white/40 text-xs mb-3">Hər dəyişiklik dərhal saxlanılır</p>
          <div className="divide-y divide-white/5">
            {TOGGLES.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-white/40">{t.desc}</p>
                  </div>
                </div>
                <Toggle
                  value={local[t.key] as boolean}
                  onChange={(v) => update({ [t.key]: v } as Partial<AccessibilityConfig>)}
                />
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-white/30 text-xs">Dəyişikliklər avtomatik saxlanılır.</p>

      </div>
    </div>
  )
}
