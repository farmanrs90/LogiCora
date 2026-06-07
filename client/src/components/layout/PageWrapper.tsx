import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSelector } from 'react-redux'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { APP_ROUTES } from '../../constants'
import type { RootState } from '../../app/store'
import type { Role } from '../../types'
import CompanionWidget from '../companion/CompanionWidget'

// ── Bottom tab bar data ───────────────────────────────────────────────────

interface TabItem {
  icon:  string
  label: string
  path:  string
}

const studentTabs: TabItem[] = [
  { icon: '🏠', label: 'Ana',     path: APP_ROUTES.DASHBOARD.STUDENT },
  { icon: '📅', label: 'Quiz',    path: APP_ROUTES.DAILY },
  { icon: '⚔️', label: 'Yarış',   path: '/competition' },
  { icon: '🎓', label: 'Kurslar', path: APP_ROUTES.COURSES },
  { icon: '📊', label: 'Portfolio', path: '/portfolio/me' },
]

const teacherTabs: TabItem[] = [
  { icon: '🏠', label: 'Ana',      path: APP_ROUTES.DASHBOARD.TEACHER },
  { icon: '⚔️', label: 'Yarış',    path: '/competition/create' },
]

const parentTabs: TabItem[] = [
  { icon: '🏠', label: 'Ana',      path: APP_ROUTES.DASHBOARD.PARENT },
]

const tabsByRole: Record<string, TabItem[]> = {
  student: studentTabs,
  teacher: teacherTabs,
  parent:  parentTabs,
}

// ── Bottom tab bar (mobile only) ──────────────────────────────────────────

function BottomTabBar({ role }: { role: Role | undefined }) {
  const location   = useLocation()
  const navigate   = useNavigate()
  const avatarColor = useSelector((s: RootState) => s.theme.avatarColor)

  const tabs = tabsByRole[role ?? 'student'] ?? studentTabs

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:hidden z-40 flex items-center
                 justify-around px-2 py-1"
      style={{
        background:     'rgba(17,24,39,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop:      '1px solid rgba(255,255,255,0.07)',
        height:         64,
      }}
      aria-label="Mobil naviqasiya"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path ||
          (tab.path.length > 1 && location.pathname.startsWith(tab.path))

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl
                       transition-colors duration-150 relative"
            style={{ color: isActive ? avatarColor : '#6B7280' }}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>

            {isActive && (
              <motion.div
                layoutId="bottom-tab-dot"
                className="absolute -top-0.5 w-1 h-1 rounded-full"
                style={{ backgroundColor: avatarColor }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ── Page enter animation ──────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

// ── PageWrapper ───────────────────────────────────────────────────────────

interface PageWrapperProps {
  children: React.ReactNode
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const authUser  = useSelector((s: RootState) => s.auth.user)
  const { user: ctxUser } = useAuth()
  const user = authUser ?? ctxUser

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Fixed sidebar — desktop only */}
      <Sidebar />

      {/* Fixed navbar — spans from sidebar right edge on desktop */}
      <Navbar />

      {/* Main content area */}
      <main
        className="lg:pl-[15rem] pt-16 pb-16 lg:pb-0 min-h-screen"
        id="main-content"
      >
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          className="min-h-[calc(100vh-4rem)]"
        >
          {children}
        </motion.div>
      </main>

          {/* Mobile bottom tab bar */}
      <BottomTabBar role={user?.role} />

      {/* Floating köməkçi — bütün app səhifələrində yanında */}
      <CompanionWidget />
    </div>
  )
}
