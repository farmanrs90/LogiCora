import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Settings, LogOut, ChevronDown, X, Menu, UserRound, SlidersHorizontal, MessageSquarePlus, BarChart3 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RootState } from '../../app/store'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { GamificationProfile, Role } from '../../types'

// ── Nav items (Sidebar ilə eyni route-lar, yalnız label/path) ───────────────

interface NavItem { label: string; path: string }

interface NavbarNotification {
  _id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt?: string
}

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

// Admin: yalnız mövcud route-lar (/admin, /chat, /settings) — student nav-a düşmə düzəlişi
const adminNav: NavItem[] = [
  { label: 'Admin panel', path: APP_ROUTES.ADMIN },
  { label: 'Mesajlar', path: APP_ROUTES.CHAT },
  { label: 'Tənzimləmələr', path: APP_ROUTES.SETTINGS },
]

const navByRole: Record<string, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  parent: parentNav,
  admin: adminNav,
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
  { name: 'Bürünc', min: 0, color: '#B45309' },
  { name: 'Gümüş', min: 1000, color: '#64748B' },
  { name: 'Qızıl', min: 5000, color: '#D97706' },
  { name: 'Platin', min: 15000, color: '#0EA5E9' },
  { name: 'Almaz', min: 50000, color: '#7C3AED' },
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
        boxShadow: '0 2px 8px rgba(15,23,42,0.18)',
        border: '2px solid rgba(255,255,255,0.85)',
        fontSize: size * 0.38,
      }}
    >
      {initial}
    </div>
  )
}

// ── Notification item ─────────────────────────────────────────────────────

function formatNotificationTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function NotifItem({ n }: { n: NavbarNotification }) {
  const typeIcon: Record<string, string> = {
    assessment_result: '📝',
    payment_due: '💳',
    payment_received: '✅',
    attendance_marked: '📅',
    new_assessment: '🧪',
    new_course: '📚',
    system: '💬',
  }
  const time = formatNotificationTime(n.createdAt)

  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-colors ${n.isRead ? 'opacity-80' : 'bg-indigo-50'}`}>
      <span className="text-xl shrink-0 mt-0.5">{typeIcon[n.type] ?? '💬'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold leading-tight text-gray-900">{n.title}</p>
          {time && <span className="shrink-0 text-[10px] font-medium text-gray-400">{time}</span>}
        </div>
        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
      </div>
      {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
    </div>
  )
}

// ── Tier dot ────────────────────────────────────────────────────────────────

function TierDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)' }}
    />
  )
}

// ── Wordmark (light header) ─────────────────────────────────────────────────

function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to={APP_ROUTES.DASHBOARD.ROOT}
      onClick={onClick}
      className="flex items-center gap-2 shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label="LogiCora — ana səhifə"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] shadow-sm shadow-indigo-500/30">
        <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-gray-900">Logi</span>
        <span className="text-indigo-600">Cora</span>
      </span>
    </Link>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { logout } = useAuth()

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const notificationQueryKey = ['notifications', 'navbar', user?._id] as const

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

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useQuery<NavbarNotification[]>({
    queryKey: notificationQueryKey,
    queryFn: () => api.get<{ data: NavbarNotification[] }>(API_ROUTES.NOTIFICATIONS.LIST).then(r => r.data.data ?? []),
    enabled: Boolean(user),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.patch(API_ROUTES.NOTIFICATIONS.MARK_ALL).then(r => r.data),
    onSuccess: () => {
      queryClient.setQueryData<NavbarNotification[]>(notificationQueryKey, (old) =>
        old ? old.map((n) => ({ ...n, isRead: true })) : old,
      )
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications', 'list'] })
    },
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
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-[72px] z-40 flex items-center gap-3 px-4 lg:px-6 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">

        {/* ── Left — hamburger (mobil) + logo ── */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
          aria-label="Menyu aç"
          aria-expanded={drawerOpen}
        >
          <Menu size={20} />
        </button>

        <Wordmark />

        {/* ── Desktop horizontal nav ── */}
        <nav
          className="hidden lg:flex flex-1 min-w-0 items-center justify-start gap-1 pl-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-1.5">
              <TierDot color={tier.current.color} />
              <div className="leading-tight">
                <p className="text-xs font-bold text-gray-900">{tier.current.name}</p>
                <p className="text-[10px] tabular-nums text-gray-500">{fmt(gp!.totalXP)} XP</p>
              </div>
            </div>
          )}

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false) }}
              className="relative h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors
                         flex items-center justify-center text-gray-600 hover:text-gray-900
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
                             flex items-center justify-center ring-2 ring-white"
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
                  className="absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50
                             bg-white border border-gray-200 shadow-[0_16px_48px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-gray-900 font-bold text-sm">Bildirişlər</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllMutation.mutate()}
                          disabled={markAllMutation.isPending}
                          className="text-indigo-600 text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {markAllMutation.isPending ? 'Oxunur...' : 'Hamısını oxu'}
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-700">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {markAllMutation.isError && (
                    <p className="px-4 pt-3 text-xs font-medium text-rose-600">
                      Bildirişlər oxundu kimi işarələnmədi. Yenidən cəhd edin.
                    </p>
                  )}

                  <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                    {notificationsLoading ? (
                      <p className="text-center text-sm text-gray-500 py-6">Bildirişlər yüklənir...</p>
                    ) : notificationsError ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">Bildirişlər yüklənmədi.</p>
                        <button
                          onClick={() => { void refetchNotifications() }}
                          className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Yenidən yoxla
                        </button>
                      </div>
                    ) : recent5.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-6">Yeni bildiriş yoxdur.</p>
                    ) : (
                      recent5.map((n) => <NotifItem key={n._id} n={n} />)
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar dropdown */}
          <div className="relative" ref={avatarRef}>
            <button
              onClick={() => { setAvatarOpen((v) => !v); setNotifOpen(false) }}
              className="flex items-center gap-2 rounded-xl px-2 py-1
                         hover:bg-gray-100 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Profil menyusu"
              aria-expanded={avatarOpen}
            >
              {user && <AvatarCircle name={user.name} color={avatarColor} size={36} />}
              <ChevronDown
                size={14}
                className="text-gray-400 transition-transform duration-200 hidden sm:block"
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
                  className="absolute right-0 top-14 w-64 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden z-50
                             bg-white border border-gray-200 shadow-[0_16px_48px_rgba(15,23,42,0.18)]"
                >
                  {/* User info */}
                  {user && (
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-gray-900 font-bold text-sm leading-tight">{user.name} {user.surname}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{roleLabelMap[user.role]}</p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{user.email}</p>
                    </div>
                  )}

                  {/* Status — real XP-dən hesablanmış tier + irəliləyiş */}
                  {tier && (
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TierDot color={tier.current.color} />
                          <span className="text-gray-900 font-bold text-sm">{tier.current.name} status</span>
                        </div>
                        <span className="text-gray-500 text-xs">Lv.{gp!.level}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${tier.progress}%`, backgroundColor: tier.current.color }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="tabular-nums">{fmt(gp!.totalXP)} XP</span>
                        <span>{tier.next ? `${fmt(tier.toNext)} XP → ${tier.next.name}` : 'Maksimal tier'}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1.5">
                          <p className="text-[10px] text-gray-500">Seriya</p>
                          <p className="text-sm font-bold tabular-nums text-gray-900">{gp!.streak} gün</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1.5">
                          <p className="text-[10px] text-gray-500">Kristal</p>
                          <p className="text-sm font-bold tabular-nums text-cyan-600">{fmt(gp!.gems)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => { goTo(`${APP_ROUTES.SETTINGS}#account`) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-100
                                 transition-colors text-sm"
                    >
                      <UserRound size={15} /> Profilim
                    </button>

                    <button
                      onClick={() => { goTo(`${APP_ROUTES.SETTINGS}#adaptive`) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-100
                                 transition-colors text-sm"
                    >
                      <SlidersHorizontal size={15} /> Tənzimləmələr
                    </button>

                    <button
                      onClick={() => { goTo(APP_ROUTES.RESULTS) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-100
                                 transition-colors text-sm"
                    >
                      <BarChart3 size={15} /> Nəticələr
                    </button>

                    <button
                      onClick={() => { goTo(APP_ROUTES.FEEDBACK) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-100
                                 transition-colors text-sm"
                    >
                      <MessageSquarePlus size={15} /> Təklif və İradlar
                    </button>

                    <button
                      onClick={() => { handleLogout(); setAvatarOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-red-600 hover:bg-red-50
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
              className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white border-r border-gray-200 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Naviqasiya menyusu"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <Wordmark onClick={() => setDrawerOpen(false)} />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Menyu bağla"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User + tier */}
              {user && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <AvatarCircle name={user.name} color={avatarColor} size={44} />
                    <div className="min-w-0">
                      <p className="text-gray-900 font-bold text-sm truncate">{user.name} {user.surname}</p>
                      <p className="text-gray-500 text-xs">{roleLabelMap[user.role]}</p>
                    </div>
                  </div>
                  {tier && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2">
                      <TierDot color={tier.current.color} />
                      <span className="text-gray-900 text-xs font-bold">{tier.current.name}</span>
                      <span className="ml-auto text-[11px] tabular-nums text-gray-500">{fmt(gp!.totalXP)} XP</span>
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
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </nav>

              {/* Settings + logout */}
              <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
                <button
                  type="button"
                  onClick={() => goTo(`${APP_ROUTES.SETTINGS}#account`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <UserRound size={16} /> Profilim
                </button>
                <button
                  type="button"
                  onClick={() => goTo(`${APP_ROUTES.SETTINGS}#adaptive`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Settings size={16} /> Tənzimləmələr
                </button>
                <button
                  type="button"
                  onClick={() => goTo(APP_ROUTES.RESULTS)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <BarChart3 size={16} /> Nəticələr
                </button>
                <button
                  type="button"
                  onClick={() => goTo(APP_ROUTES.FEEDBACK)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <MessageSquarePlus size={16} /> Təklif və İradlar
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
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
