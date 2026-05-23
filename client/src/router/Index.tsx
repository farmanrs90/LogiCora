import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { APP_ROUTES } from '../constants'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleRoute from '../components/RoleRoute'
import PageWrapper from '../components/layout/PageWrapper'
import type { Role } from '../types'
import Spinner from '../components/Spinner'

// Auth + public
import Login          from '../pages/auth/Login'
import Register       from '../pages/auth/Register'
import Landing        from '../pages/Landing'
import NotFound       from '../pages/NotFound'
import Onboarding     from '../pages/Onboarding'

// Dashboard pages
import StudentDashboard from '../pages/dashboard/Student'
import TeacherDashboard from '../pages/dashboard/Teacher'
import ParentDashboard  from '../pages/dashboard/Parent'

// Feature pages (all get PageWrapper)
import DailyQuiz       from '../pages/daily/Index'
import CompetitionRoom from '../pages/competition/Index'
import CompetitionLobby from '../pages/competition/Lobby'
import WeeklyMystery   from '../pages/weekly/Index'
import ClanDetail      from '../pages/clans/Detail'
import Classroom       from '../pages/classroom/Index'
import Courses         from '../pages/courses/Index'
import CourseDetail    from '../pages/courses/Detail'
import PortfolioView   from '../pages/portfolio/View'
import TeacherStorefront from '../pages/teachers/Storefront'
import Chat            from '../pages/chat/Index'
import Settings        from '../pages/settings/Index'
import Admin           from '../pages/admin/Index'

// ── Helpers ───────────────────────────────────────────────────────────────

const roleDashboard: Record<Role, string> = {
  student: APP_ROUTES.DASHBOARD.STUDENT,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent:  APP_ROUTES.DASHBOARD.PARENT,
  admin:   APP_ROUTES.ADMIN,
  manager: APP_ROUTES.DASHBOARD.ROOT,
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <Spinner size="lg" />
      </div>
    )
  }
  if (isAuthenticated && user) return <Navigate to={roleDashboard[user.role]} replace />
  return <>{children}</>
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={roleDashboard[user.role]} replace />
}

// PageWrapper-li protected route helper
function PW({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PageWrapper>{children}</PageWrapper>
    </ProtectedRoute>
  )
}

// ── Router ────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── İctimai — guest ──────────────────────────────────── */}
        <Route path={APP_ROUTES.HOME}     element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path={APP_ROUTES.LOGIN}    element={<GuestRoute><Login /></GuestRoute>} />
        <Route path={APP_ROUTES.REGISTER} element={<GuestRoute><Register /></GuestRoute>} />

        {/* Public — auth tələb olunmur */}
        <Route path={APP_ROUTES.PORTFOLIO(':link')} element={<PortfolioView />} />
        <Route path={APP_ROUTES.TEACHER(':slug')}   element={<TeacherStorefront />} />

        {/* ── Onboarding — layout yoxdur ───────────────────────── */}
        <Route
          path={APP_ROUTES.ONBOARDING}
          element={<ProtectedRoute><Onboarding /></ProtectedRoute>}
        />

        {/* ── Dashboard root — redirect ─────────────────────────── */}
        <Route
          path={APP_ROUTES.DASHBOARD.ROOT}
          element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>}
        />

        {/* ── Rol dashboard-ları ────────────────────────────────── */}
        <Route
          path={APP_ROUTES.DASHBOARD.STUDENT}
          element={
            <RoleRoute roles={['student']}>
              <PageWrapper><StudentDashboard /></PageWrapper>
            </RoleRoute>
          }
        />
        <Route
          path={APP_ROUTES.DASHBOARD.TEACHER}
          element={
            <RoleRoute roles={['teacher']}>
              <PageWrapper><TeacherDashboard /></PageWrapper>
            </RoleRoute>
          }
        />
        <Route
          path={APP_ROUTES.DASHBOARD.PARENT}
          element={
            <RoleRoute roles={['parent']}>
              <PageWrapper><ParentDashboard /></PageWrapper>
            </RoleRoute>
          }
        />

        {/* ── Feature routes — hamısı PageWrapper ilə ──────────── */}
        <Route path={APP_ROUTES.DAILY}          element={<PW><DailyQuiz /></PW>} />
        <Route path="/competition/:id"           element={<PW><CompetitionRoom /></PW>} />
        <Route path="/competition/:id/lobby"     element={<PW><CompetitionLobby /></PW>} />
        <Route path={APP_ROUTES.WEEKLY_MYSTERY}  element={<PW><WeeklyMystery /></PW>} />
        <Route path="/clan/:slug"                element={<PW><ClanDetail /></PW>} />
        <Route path={APP_ROUTES.COURSES}         element={<PW><Courses /></PW>} />
        <Route path="/courses/:id"               element={<PW><CourseDetail /></PW>} />
        <Route path="/classroom/:id"             element={<PW><Classroom /></PW>} />
        <Route path={APP_ROUTES.CHAT}            element={<PW><Chat /></PW>} />
        <Route path={APP_ROUTES.SETTINGS}        element={<PW><Settings /></PW>} />

        {/* ── Admin ─────────────────────────────────────────────── */}
        <Route
          path={APP_ROUTES.ADMIN}
          element={
            <RoleRoute roles={['admin']}>
              <PageWrapper><Admin /></PageWrapper>
            </RoleRoute>
          }
        />

        {/* ── 404 ───────────────────────────────────────────────── */}
        <Route path={APP_ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
