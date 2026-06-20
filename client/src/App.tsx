import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppRouter from './router/Index'
import api from './lib/api'
import { API_ROUTES } from './constants'

// Settings-də saxlanan real accessibility ayarları → bütün app üçün <html> data-atributları.
interface A11yConfig {
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  highContrast: boolean
  audioQuestions: boolean
  simplifiedUI: boolean
  noAnimations: boolean
  largeClickTargets: boolean
  keyboardOnly: boolean
}

const FONT_PX: Record<A11yConfig['fontSize'], number> = { sm: 14, md: 16, lg: 18, xl: 22 }

const A11Y_ATTRS = [
  'data-high-contrast',
  'data-large-buttons',
  'data-simplified-ui',
  'data-reduced-motion',
  'data-keyboard-mode',
]

// Ayrı komponent: AuthProvider daxilində olmalıdır (useAuth) + QueryClient main.tsx-də verilib.
function AccessibilityEffects() {
  const { user } = useAuth()

  // Settings ilə eyni query key → toggle saxlananda (setQueryData) effekt dərhal yenilənir.
  const { data } = useQuery<A11yConfig>({
    queryKey: ['accessibility', 'me'],
    queryFn: () => api.get<{ data: A11yConfig }>(API_ROUTES.ACCESSIBILITY.ME).then((r) => r.data.data),
    enabled: !!user,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    const el = document.documentElement

    // Çıxış/məlumat yoxdursa effektləri sıfırla (köhnə istifadəçinin ayarı qalmasın, fake state yox).
    if (!user || !data) {
      A11Y_ATTRS.forEach((a) => el.removeAttribute(a))
      el.style.removeProperty('font-size')
      return
    }

    const setFlag = (attr: string, on: boolean) => {
      if (on) el.setAttribute(attr, 'true')
      else el.removeAttribute(attr)
    }

    setFlag('data-high-contrast', !!data.highContrast)
    setFlag('data-large-buttons', !!data.largeClickTargets)
    setFlag('data-simplified-ui', !!data.simplifiedUI)
    setFlag('data-reduced-motion', !!data.noAnimations)
    setFlag('data-keyboard-mode', !!data.keyboardOnly)
    el.style.fontSize = `${FONT_PX[data.fontSize] ?? 16}px`
  }, [user, data])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <AccessibilityEffects />
      <AppRouter />
    </AuthProvider>
  )
}
