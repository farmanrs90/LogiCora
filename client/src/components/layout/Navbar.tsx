import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Settings, LogOut, ChevronDown, X, Menu } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { markAllAsRead } from '../../features/notifications/notificationSlice'
import type { RootState, AppDispatch } from '../../app/store'
import type { AppNotification } from '../../features/notifications/notificationSlice'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { GamificationProfile, Role } from '../../types'

// ── Nav items (Sidebar ilə eyni route-lar, yalnız label/path) ───────────────

interface NavItem { label: string; path: string }

const studentNav: NavItem[] = [
  { label: 'Ana səhifə', path: APP_ROUTES.DASHBOARD.STUDENT },
  { label: 'Günlük Quiz', path: APP_ROUTES.DAILY },
  { label: 'Uşaq Klubu', path: APP_ROUTES.KIDS_HUB },
  { label: 'Yarışlar', path: '/competition' },
  { label: 'Klanım', path: '/clan/me' },
  { label: 'Kurslar', path: APP_ROUTES.COURSES },
  { label: 'Portfoliom', path: '/portfolio/me' },
  { label: 'Mesajlar', path: APP_ROUTES.CHAT },
  { label: 'Həftənin Sirri', path: APP_ROUTES.WEEKLY_MYSTERY },
]

const teacherNav: NavItem[] = [
  { label: 'Ana səhifə', path: APP_ROUTES.DASHBOARD.TEACHER },
  { label: 'Qruplarım', path: '/groups' },
  { label: 'Davamiyyət', path: '/attendance' },
  { label: 'Yarış yarat', path: '/competition/create' },
  { label: 'Kurslarım', path: '/courses' },
  { label: 'Analitika', path: '/analytics' },
  { label: 'Mesajlar', path: APP_ROUTES.CHAT },
  { label: 'Sinif', path: '/classroom' },
]

const parentNav: NavItem[] = [
  { label: 'Ana səhifə', path: APP_ROUTES.DASHBOARD.PARENT },
  { label: 'Övladım', path: `${APP_ROUTES.DASHBOARD.PARENT}#child-section` },
  { label: 'İrəliləyiş', path: `${APP_ROUTES.DASHBOARD.PARENT}#progress-section` },
  { label: 'Davamiyyət', path: `${APP_ROUTES.DASHBOARD.PARENT}#attendance-section` },
  { label: 'Müəllimlə', path: APP_ROUTES.CHAT },
  { label: 'Ödənişlər', path: `${APP_ROUTES.DASHBOARD.PARENT}#payments-section` },
]

const navByRole: Record<string, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  parent: parentNav,
}

const roleLabelMap: Record<Role, string> = {
  student: 'Tələbə',
  teacher: 'Müəllim',
  parent: 'Valideyn',
  admin: 'Admin',
  manager: 'Menecer',
}

// Uşaq Klubu yalnız kiçik yaş tələbələrinə (3-8 yaş) göstərilir
const KID_AGES = ['3-5', '6-8']

// ── Status tier — REAL totalXP-dən hesablanır (backend uydurması yoxdur) ────

interface Tier { name: string; min: number; color: string }

const TIERS: Tier[] = [
  { name: 'Bürünc', min: 0, color: '#CD7F32' },
  { name: 'Gümüş', min: 1000, color: '#C0C0C0' },
  { name: 'Qızıl', min: 5000, color: '#FFD700' },
  { name: 'Platin', min: 15000, color: '#E5E4E2' },
  { name: 'Almaz', min: 50000, color: '#B9F2FF' },
]

function getTier(totalXP: number) {
  let index = 0
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalXP >= TIERS[i].min) { index = i; break }
  }
  const current = TIERS[index]
  const next = TIERS[index + 1] ?? null
  const progress = next
    ? Math.max(0, Math.min(100, ((totalXP - current.min) / (next.min - current.min)) * 100))
    : 100
  const toNext = next ? Math.max(0, next.min - totalXP) : 0
  return { current, next, progress, toNext }
}

const fmt = (n: number) => n.toLocaleString('az-AZ')

// ── Avatar circle ─────────────────────────────────────────────────────────

function AvatarCircle({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initial = (name?.charAt(0) ?? '?').toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
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

// ── Wordmark ────────────────────────────────────────────────────────────────

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to={APP_ROUTES.DASHBOARD.ROOT}
      onClick={onClick}
      className="flex items-center gap-2 shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────

export default function Navbar() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const notifications = useSelector((s: RootState) => s.notifications.notifications)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  const { data: gp } = useQuery<GamificationProfile>({
    queryKey: ['gamification', 'me'],
    queryFn: () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then(r => r.data.data),
    // /gamification/me yalnız student üçündür (parent/teacher-də Student profili yoxdur → 404).
    // Yalnız student üçün çağırılır; digər rollar üçün gp undefined qalır.
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

  // Route dəyişəndə drawer-i bağla
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Drawer açıq olanda arxa fonun şaquli scroll-unu kilidlə
  useEffect(() => {
    if (!drawerOpen) return
    document.body.style.overflowY = 'hidden'
    return () => { document.body.style.overflowY = '' }
  }, [drawerOpen])

  async function handleLogout() {
    const confirmed = window.confirm('Hesabdan çıxmaq istəyirsiniz?')
    if (!confirmed) return

    await logout()
    navigate(APP_ROUTES.LOGIN, { replace: true })
  }

  function goTo(path: string) {
    setDrawerOpen(false)
    setNotifOpen(false)
    setAvatarOpen(false)
    navigate(path)
  }

  // Rol + yaş məntiqinə görə nav items (Sidebar ilə eyni qayda)
  let navItems = navByRole[user?.role ?? 'student'] ?? studentNav
  if (user?.role === 'student' && !KID_AGES.includes(user.ageGroup)) {
    navItems = navItems.filter((i) => i.path !== APP_ROUTES.KIDS_HUB)
  }

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== APP_ROUTES.DASHBOARD.STUDENT && path.length > 1 && location.pathname.startsWith(path))

  const tier = gp ? getTier(gp.totalXP) : null
  const recent5 = notifications.slice(0, 5)

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 h-16 z-40 flex items-center gap-3 px-4 lg:px-6"
        style={{
          background: 'rgba(15,21,36,0.82)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(148,163,184,0.10)',
        }}
      >
        {/* ── Left — hamburger (mobil) + logo ── */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
          aria-label="Menyu aç"
          aria-expanded={drawerOpen}
        >
          <Menu size={20} />
        </button>

        <Wordmark />

        {/* ── Desktop horizontal nav ── */}
        <nav
          className="hidden lg:flex flex-1 min-w-0 items-center justify-start gap-1 pl-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Əsas naviqasiya"
        >
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => goTo(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* ── Right — tier chip + notifications + avatar ── */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto lg:ml-0 shrink-0">

          {/* Status tier chip (yalnız real gamifikasiya datası olanda) */}
          {tier && (
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.current.color }} />
              <div className="leading-tight">
                <p className="text-xs font-bold text-white">{tier.current.name}</p>
                <p className="text-[10px] tabular-nums text-slate-400">{fmt(gp!.totalXP)} XP</p>
              </div>
            </div>
          )}

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false) }}
              className="relative w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)]
                         hover:bg-[rgba(255,255,255,0.1)] transition-colors
                         flex items-center justify-center text-[#9CA3AF] hover:text-white
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Bildirişlər"
              aria-expanded={notifOpen}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 rounded-full
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
                  className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50
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
                         hover:bg-[rgba(255,255,255,0.06)] transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  className="absolute right-0 top-12 w-64 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50
                             bg-[#131A2E] border border-[rgba(148,163,184,0.14)]
                             shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                >
                  {/* User info */}
                  {user && (
                    <div className="p-4 border-b border-[rgba(255,255,255,0.07)]">
                      <p className="text-white font-bold text-sm leading-tight">{user.name} {user.surname}</p>
                      <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{user.email}</p>
                    </div>
                  )}

                  {/* Status — real XP-dən hesablanmış tier + irəliləyiş */}
                  {tier && (
                    <div className="p-4 border-b border-[rgba(255,255,255,0.07)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.current.color }} />
                          <span className="text-white font-bold text-sm">{tier.current.name} status</span>
                        </div>
                        <span className="text-[#9CA3AF] text-xs">Lv.{gp!.level}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${tier.progress}%`, backgroundColor: tier.current.color }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#9CA3AF]">
                        <span className="tabular-nums">{fmt(gp!.totalXP)} XP</span>
                        <span>{tier.next ? `${fmt(tier.toNext)} XP → ${tier.next.name}` : 'Maksimal tier'}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5">
                          <p className="text-[10px] uppercase text-[#9CA3AF]">Seriya</p>
                          <p className="text-sm font-bold tabular-nums text-white">{gp!.streak} gün</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5">
                          <p className="text-[10px] uppercase text-[#9CA3AF]">Kristal</p>
                          <p className="text-sm font-bold tabular-nums text-[#06B6D4]">{fmt(gp!.gems)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => { goTo(APP_ROUTES.SETTINGS) }}
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

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col lg:hidden"
              style={{ background: 'linear-gradient(180deg, #131A2E 0%, #0E1525 100%)', borderRight: '1px solid rgba(99,102,241,0.12)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Naviqasiya menyusu"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(148,163,184,0.10)]">
                <Wordmark onClick={() => setDrawerOpen(false)} />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Menyu bağla"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User + tier */}
              {user && (
                <div className="px-5 py-4 border-b border-[rgba(148,163,184,0.10)]">
                  <div className="flex items-center gap-3">
                    <AvatarCircle name={user.name} color={avatarColor} size={44} />
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{user.name} {user.surname}</p>
                      <p className="text-[#9CA3AF] text-xs">{roleLabelMap[user.role]}</p>
                    </div>
                  </div>
                  {tier && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tier.current.color }} />
                      <span className="text-white text-xs font-bold">{tier.current.name}</span>
                      <span className="ml-auto text-[11px] tabular-nums text-[#9CA3AF]">{fmt(gp!.totalXP)} XP</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Mobil naviqasiya">
                {navItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => goTo(item.path)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        active
                          ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/30'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </nav>

              {/* Settings + logout */}
              <div className="px-3 py-4 border-t border-[rgba(148,163,184,0.10)] space-y-0.5">
                <button
                  type="button"
                  onClick={() => goTo(APP_ROUTES.SETTINGS)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Settings size={16} /> Tənzimləmələr
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                >
                  <LogOut size={16} /> Çıxış
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
