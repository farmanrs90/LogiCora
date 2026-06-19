import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Settings, LogOut, ChevronDown, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { markAllAsRead } from '../../features/notifications/notificationSlice'
import type { RootState, AppDispatch } from '../../app/store'
import type { AppNotification } from '../../features/notifications/notificationSlice'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { GamificationProfile } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────

function streakColor(streak: number): string {
  if (streak >= 100) return '#EF4444'
  if (streak >= 31) return '#F97316'
  if (streak >= 8) return '#58CC02'
  return '#3B82F6'
}

function xpProgress(totalXP: number, level: number): number {
  const xpPerLevel = level * 200
  return Math.min(((totalXP % xpPerLevel) / xpPerLevel) * 100, 100)
}

function xpToNext(totalXP: number, level: number): number {
  const xpPerLevel = level * 200
  return xpPerLevel - (totalXP % xpPerLevel)
}

// ── Avatar circle ─────────────────────────────────────────────────────────

function AvatarCircle({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initial = (name?.charAt(0) ?? '?').toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 cursor-pointer"
      style={{
        width: size, height: size,
        backgroundColor: color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.08)',
        fontSize: size * 0.38,
      }}
    >
      {initial}
    </div>
  )
}

// ── Notification item ─────────────────────────────────────────────────────

function NotifItem({ n }: { n: AppNotification }) {
  const typeIcon: Record<AppNotification['type'], string> = {
    info: '💬', success: '✅', warning: '⚠️', achievement: '🏆', challenge: '⚔️',
  }
  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-colors ${n.isRead ? 'opacity-60' : 'bg-[rgba(99,102,241,0.08)]'}`}>
      <span className="text-xl shrink-0 mt-0.5">{typeIcon[n.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-tight truncate">{n.title}</p>
        <p className="text-[#9CA3AF] text-xs mt-0.5 line-clamp-2">{n.message}</p>
      </div>
      {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#6366F1] mt-1.5 shrink-0" />}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────

export default function Navbar() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const notifications = useSelector((s: RootState) => s.notifications.notifications)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [xpTooltip, setXpTooltip] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  const { data: gp } = useQuery<GamificationProfile>({
    queryKey: ['gamification', 'me'],
    queryFn: () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then(r => r.data.data),
    // /gamification/me yalnız student üçündür (parent/teacher-də Student profili yoxdur → 404).
    // Yalnız student üçün çağırılır; digər rollar üçün gp undefined qalır və neytral default göstərilir.
    enabled: user?.role === 'student',
    staleTime: 1000 * 60 * 2,
  })

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    const confirmed = window.confirm('Hesabdan çıxmaq istəyirsiniz?')
    if (!confirmed) return

    await logout()
    navigate(APP_ROUTES.LOGIN, { replace: true })
  }

  const sColor = gp ? streakColor(gp.streak) : '#3B82F6'
  const xpPct = gp ? xpProgress(gp.totalXP, gp.level) : 0
  const xpRemain = gp ? xpToNext(gp.totalXP, gp.level) : 0
  const recent5 = notifications.slice(0, 5)

  return (
    <header
      className="fixed top-0 right-0 left-0 lg:left-60 h-16 z-40 flex items-center px-4 lg:px-6 gap-4"
      style={{
        background: 'rgba(15,21,36,0.82)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148,163,184,0.10)',
      }}
    >
      {/* ── Logo (left, mobile) — Landing marka stili ── */}
      <Link
        to={APP_ROUTES.DASHBOARD.ROOT}
        className="flex items-center gap-2 shrink-0 lg:hidden"
        aria-label="LogiCora — ana səhifə"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#3B82F6] shadow-sm shadow-indigo-500/30">
          <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
        </span>
        <span className="text-xl font-extrabold tracking-tight">
          <span className="text-white">Logi</span>
          <span className="text-[#818CF8]">Cora</span>
        </span>
      </Link>

      {/* ── Center — streak / XP / gems (desktop, achievement-style chips) ── */}
      <div className="hidden lg:flex items-center gap-3 flex-1 justify-center">

        {/* Streak */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1">
          <span className="text-base leading-none">🔥</span>
          <span className="font-bold text-sm" style={{ color: sColor }}>
            {gp?.streak ?? 0}
          </span>
        </div>

        {/* XP bar */}
        <div
          className="relative flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1"
          onMouseEnter={() => setXpTooltip(true)}
          onMouseLeave={() => setXpTooltip(false)}
        >
          <span className="text-[#9CA3AF] text-xs font-medium shrink-0">
            Lv.{gp?.level ?? 1}
          </span>
          <div className="w-28 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: avatarColor }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' as const }}
            />
          </div>
          <span className="text-[#9CA3AF] text-xs shrink-0">{gp?.totalXP ?? 0} XP</span>

          {/* Tooltip */}
          <AnimatePresence>
            {xpTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                           bg-[#1E293B] border border-[rgba(148,163,184,0.18)]
                           text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none z-50"
              >
                Növbəti level üçün {xpRemain} XP lazımdır
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Gems */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1">
          <span className="text-sm leading-none">💎</span>
          <span className="font-bold text-sm text-[#06B6D4]">{gp?.gems ?? 0}</span>
        </div>
      </div>

      {/* Spacer on desktop (pushes right items to right) */}
      <div className="hidden lg:block flex-1" />

      {/* ── Right — notifications + avatar ── */}
      <div className="flex items-center gap-3 ml-auto">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false) }}
            className="relative w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)]
                       hover:bg-[rgba(255,255,255,0.1)] transition-colors
                       flex items-center justify-center text-[#9CA3AF] hover:text-white"
            aria-label="Bildirişlər"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full
                           bg-[#EF4444] text-white text-[9px] font-bold
                           flex items-center justify-center"
                style={{ width: 18, height: 18 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50
                           bg-[#131A2E] border border-[rgba(148,163,184,0.14)]
                           shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.07)]">
                  <h3 className="text-white font-bold text-sm">Bildirişlər</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => dispatch(markAllAsRead())}
                        className="text-[#818CF8] text-xs hover:underline"
                      >
                        Hamısını oxu
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-[#9CA3AF] hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                  {recent5.length === 0 ? (
                    <p className="text-[#9CA3AF] text-sm text-center py-6">Bildiriş yoxdur</p>
                  ) : (
                    recent5.map((n) => <NotifItem key={n.id} n={n} />)
                  )}
                </div>

                {notifications.length > 5 && (
                  <div className="p-3 border-t border-[rgba(255,255,255,0.07)]">
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="w-full text-[#818CF8] text-xs hover:underline"
                    >
                      Hamısına bax →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => { setAvatarOpen((v) => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 rounded-xl px-2 py-1
                       hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            aria-label="Profil menyusu"
            aria-expanded={avatarOpen}
          >
            {user && <AvatarCircle name={user.name} color={avatarColor} size={34} />}
            <ChevronDown
              size={14}
              className="text-[#9CA3AF] transition-transform duration-200 hidden sm:block"
              style={{ transform: avatarOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-12 w-52 rounded-2xl overflow-hidden z-50
                           bg-[#131A2E] border border-[rgba(148,163,184,0.14)]
                           shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
              >
                {/* User info */}
                {user && (
                  <div className="p-4 border-b border-[rgba(255,255,255,0.07)]">
                    <p className="text-white font-bold text-sm leading-tight">{user.name} {user.surname}</p>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">{user.email}</p>
                  </div>
                )}

                <div className="p-2 space-y-0.5">
                  <button
                    onClick={() => { navigate(APP_ROUTES.SETTINGS); setAvatarOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                               text-[#9CA3AF] hover:text-white hover:bg-[rgba(255,255,255,0.07)]
                               transition-colors text-sm"
                  >
                    <Settings size={15} /> Tənzimləmələr
                  </button>

                  <button
                    onClick={() => { handleLogout(); setAvatarOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                               text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]
                               transition-colors text-sm"
                  >
                    <LogOut size={15} /> Çıxış
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
