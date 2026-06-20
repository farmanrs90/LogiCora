import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { API_ROUTES } from '../../constants'

interface AccessibilityConfig {
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  highContrast: boolean
  audioQuestions: boolean
  simplifiedUI: boolean
  noAnimations: boolean
  largeClickTargets: boolean
  keyboardOnly: boolean
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
  { value: 'sm' as const, label: 'Kiçik', px: 14 },
  { value: 'md' as const, label: 'Normal', px: 16 },
  { value: 'lg' as const, label: 'Böyük', px: 18 },
  { value: 'xl' as const, label: 'Çox böyük', px: 22 },
]

const TOGGLES: { key: keyof AccessibilityConfig; label: string; desc: string; emoji: string }[] = [
  { key: 'highContrast', label: 'Yüksək kontrast', desc: 'Rəngləri daha sezilən et', emoji: '🌗' },
  { key: 'audioQuestions', label: 'Sual səsi', desc: 'Sualları səslə dinlə', emoji: '🔊' },
  { key: 'simplifiedUI', label: 'Sadə interfeys', desc: 'Bəzəkləri azalt', emoji: '✨' },
  { key: 'noAnimations', label: 'Animasiyasız', desc: 'Bütün animasiyaları söndür', emoji: '🚫' },
  { key: 'largeClickTargets', label: 'Böyük düymələr', desc: 'Daha böyük klik sahəsi', emoji: '👆' },
  { key: 'keyboardOnly', label: 'Yalnız klaviatura', desc: 'Klaviatura naviqasiyası', emoji: '⌨️' },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
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
    queryFn: () => api.get<{ data: AccessibilityConfig }>(API_ROUTES.ACCESSIBILITY.ME).then(r => r.data.data),
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Tənzimləmələr</h1>
            <p className="mt-1 text-sm text-gray-600">Profil, görünüş və adaptiv öyrənmə seçimlərini idarə et.</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-900 rounded-lg px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ← Geri
          </button>
        </div>

        {/* Font size */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-bold text-gray-900">Şrift ölçüsü</h2>
            <p className="mt-0.5 text-xs text-gray-500">Dərhal tətbiq olunur</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FONT_SIZES.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => update({ fontSize: opt.value })}
                whileTap={{ scale: 0.96 }}
                className={`py-3 rounded-xl border transition-colors flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${local.fontSize === opt.value
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                aria-pressed={local.fontSize === opt.value}
              >
                <span style={{ fontSize: opt.px, lineHeight: 1 }}>A</span>
                <span className="text-[10px] text-gray-400">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Adaptive learning / Accessibility */}
        <section className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">♿</div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900">Adaptiv öyrənmə / Əlçatımlılıq</h2>
              <p className="mt-1 text-xs text-gray-500">
                Bu rejim böyük düymələr, daha sadə görünüş və azaldılmış vizual yük üçün istifadə olunur. Hər dəyişiklik dərhal saxlanılır.
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-700">Bu seçim tibbi diaqnoz deyil.</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            {TOGGLES.map(t => (
              <div key={t.key} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
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

        <p className="text-center text-xs text-gray-400">Dəyişikliklər avtomatik saxlanılır.</p>

      </div>
    </div>
  )
}
