import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, LogOut } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { clearAuth } from '../../features/auth/authSlice'
import type { RootState, AppDispatch } from '../../app/store'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { APP_ROUTES, API_ROUTES } from '../../constants'
import type { GamificationProfile, Role } from '../../types'

// ── Nav item data ─────────────────────────────────────────────────────────

interface NavItem {
  icon:  string
  label: string
  path:  string
}

const studentNav: NavItem[] = [
  { icon: '🏠', label: 'Ana səhifə',     path: APP_ROUTES.DASHBOARD.STUDENT },
  { icon: '📅', label: 'Günlük Quiz',    path: APP_ROUTES.DAILY },
  { icon: '⚔️', label: 'Yarışlar',       path: '/competition' },
  { icon: '🛡️', label: 'Klanım',         path: '/clan/me' },
  { icon: '🎓', label: 'Kurslar',        path: APP_ROUTES.COURSES },
  { icon: '📊', label: 'Portfoliom',     path: '/portfolio/me' },
  { icon: '💬', label: 'Mesajlar',       path: APP_ROUTES.CHAT },
  { icon: '🔮', label: 'Həftənin Sirri', path: APP_ROUTES.WEEKLY_MYSTERY },
]

const teacherNav: NavItem[] = [
  { icon: '🏠', label: 'Ana səhifə',    path: APP_ROUTES.DASHBOARD.TEACHER },
  { icon: '👥', label: 'Qruplarım',     path: '/groups' },
  { icon: '✅', label: 'Davamiyyət',    path: '/attendance' },
  { icon: '⚔️', label: 'Yarış yarat',   path: '/competition/create' },
  { icon: '🎓', label: 'Kurslarım',     path: '/courses/my' },
  { icon: '📊', label: 'Analitika',     path: '/analytics' },
  { icon: '💬', label: 'Mesajlar',      path: APP_ROUTES.CHAT },
  { icon: '🏫', label: 'Sinif',         path: '/classroom' },
]

const parentNav: NavItem[] = [
  { icon: '🏠', label: 'Ana səhifə',   path: APP_ROUTES.DASHBOARD.PARENT },
  { icon: '👶', label: 'Övladım',      path: '/child' },
  { icon: '📊', label: 'İrəliləyiş',  path: '/progress' },
  { icon: '✅', label: 'Davamiyyət',   path: '/attendance/child' },
  { icon: '💬', label: 'Müəllimlə',   path: APP_ROUTES.CHAT },
  { icon: '💳', label: 'Ödənişlər',   path: '/payments' },
]

const navByRole: Record<string, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  parent:  parentNav,
}

// ── Role labels ───────────────────────────────────────────────────────────

const roleLabelMap: Record<Role, string> = {
  student: 'Tələbə',
  teacher: 'Müəllim',
  parent:  'Valideyn',
  admin:   'Admin',
  manager: 'Menecer',
}

// ── League badge color ────────────────────────────────────────────────────

const leagueColor: Record<string, string> = {
  bronze:   '#CD7F32',
  silver:   '#C0C0C0',
  gold:     '#FFD700',
  platinum: '#E5E4E2',
  diamond:  '#B9F2FF',
}

// ── Avatar circle ─────────────────────────────────────────────────────────

function AvatarCircle({ name, color, size = 52 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white shrink-0"
      style={{
        width: size, height: size,
        backgroundColor: color,
        boxShadow: `0 0 20px ${color}50`,
        fontSize: size * 0.38,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Single nav link ───────────────────────────────────────────────────────

function NavLink({ item, active, color }: { item: NavItem; active: boolean; color: string }) {
  const navigate = useNavigate()

  return (
    <motion.button
      onClick={() => navigate(item.path)}
      whileTap={{ scale: 0.98 }}
      className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                 transition-colors duration-150 text-left"
      style={{
        backgroundColor: active ? `${color}18` : 'transparent',
        color:           active ? '#FFFFFF'     : '#9CA3AF',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
      }}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
    >
      {/* Active left bar */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
            style={{ backgroundColor: color }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
      <span className="font-medium truncate">{item.label}</span>
    </motion.button>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const dispatch   = useDispatch<AppDispatch>()
  const navigate   = useNavigate()
  const location   = useLocation()
  const { logout } = useAuth()

  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)
  const authUser    = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  const { data: gp } = useQuery<GamificationProfile>({
    queryKey: ['gamification', 'me'],
    queryFn:  () => api.get<{ data: GamificationProfile }>(API_ROUTES.GAMIFICATION.ME).then(r => r.data.data),
    enabled:  !!user,
    staleTime: 1000 * 60 * 2,
  })

  function handleLogout() {
    logout()
    dispatch(clearAuth())
    navigate(APP_ROUTES.LOGIN, { replace: true })
    toast.success('Sistemdən çıxdınız.')
  }

  const navItems  = navByRole[user?.role ?? 'student'] ?? studentNav
  const xpPct     = gp ? Math.min(((gp.totalXP % (gp.level * 200)) / (gp.level * 200)) * 100, 100) : 0
  const xpToNext  = gp ? (gp.level * 200) - (gp.totalXP % (gp.level * 200)) : 200
  const lColor    = gp ? leagueColor[gp.leagueTier] : '#CD7F32'

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-60 hidden lg:flex flex-col z-30"
      style={{
        backgroundColor: '#111827',
        borderRight:     '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.05)]">
        <span className="text-xl font-black bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">
          LogiCora
        </span>
      </div>

      {/* Avatar section */}
      <div className="px-4 py-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {user ? (
            <AvatarCircle name={user.name} color={avatarColor} />
          ) : (
            <div className="w-13 h-13 rounded-full bg-[rgba(255,255,255,0.1)] animate-pulse" style={{ width: 52, height: 52 }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">
              {user ? `${user.name} ${user.surname}` : '...'}
            </p>
            <p className="text-[#9CA3AF] text-xs mt-0.5">
              {user ? roleLabelMap[user.role] : ''}
            </p>
            {/* Level + league badge */}
            {gp && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: `${lColor}20`, color: lColor }}
                >
                  Lv.{gp.level}
                </span>
                <span className="text-[10px] text-[#9CA3AF] capitalize">{gp.leagueTier}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5" aria-label="Əsas naviqasiya">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={location.pathname === item.path || (item.path !== APP_ROUTES.DASHBOARD.STUDENT && location.pathname.startsWith(item.path) && item.path.length > 1)}
            color={avatarColor}
          />
        ))}
      </nav>

      {/* Bottom — XP + actions */}
      <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.05)] space-y-4">
        {/* XP bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[#9CA3AF] text-xs">
              {gp ? `${gp.totalXP} XP` : '— XP'}
            </span>
            <span className="text-[#9CA3AF] text-[10px]">
              {gp ? `${xpToNext} XP qalıb` : ''}
            </span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: avatarColor }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-0.5">
          <button
            onClick={() => navigate(APP_ROUTES.SETTINGS)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                       text-[#9CA3AF] hover:text-white hover:bg-[rgba(255,255,255,0.06)]
                       transition-colors"
          >
            <Settings size={15} /> Tənzimləmələr
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                       text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]
                       transition-colors"
          >
            <LogOut size={15} /> Çıxış
          </button>
        </div>
      </div>
    </aside>
  )
}
