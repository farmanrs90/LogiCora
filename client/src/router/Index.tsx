import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { APP_ROUTES } from '../constants'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleRoute from '../components/RoleRoute'
import KidsRoute from '../components/KidsRoute'
import PageWrapper from '../components/layout/PageWrapper'
import type { Role } from '../types'
import Spinner from '../components/Spinner'

// Auth + public
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import Landing from '../pages/Landing'
import NotFound from '../pages/NotFound'
import Onboarding from '../pages/Onboarding'

// Dashboard pages
import StudentDashboard from '../pages/dashboard/Student'
import TeacherDashboard from '../pages/dashboard/Teacher'
import ParentDashboard from '../pages/dashboard/Parent'

// Feature pages (all get PageWrapper)
import DailyQuiz from '../pages/quiz/DailyQuiz'
import CompetitionRoom from '../pages/competition/CompetitionRoom'
import CompetitionLobby from '../pages/competition/CompetitionLobby'
import CompetitionResult from '../pages/competition/CompetitionResult'
import CompetitionCreate from '../pages/competition/CompetitionCreate'
import CompetitionJoin from '../pages/competition/CompetitionJoin'
import WeeklyMystery from '../pages/WeeklyMystery'
import ClanPage from '../pages/clan/ClanPage'
import ClanBattle from '../pages/clan/ClanBattle'
import ClanLeaderboard from '../pages/clan/ClanLeaderboard'
import ClassroomRoom from '../pages/classroom/ClassroomRoom'
import AttendanceQR from '../pages/classroom/AttendanceQR'
import Courses from '../pages/courses/CourseList'
import CourseDetail from '../pages/courses/CourseDetail'
import TeacherStorefront from '../pages/courses/TeacherStorefront'
import MyPortfolio from '../pages/portfolio/MyPortfolio'
import PublicPortfolio from '../pages/portfolio/PublicPortfolio'
import GroupManagement from '../pages/teacher/GroupManagement'
import TeacherAnalytics from '../pages/teacher/TeacherAnalytics'
import TeacherAttendance from '../pages/teacher/TeacherAttendance'
import TeacherClassroomIndex from '../pages/teacher/TeacherClassroomIndex'
import ChildProgress from '../pages/parent/ChildProgress'
import Chat from '../pages/chat/Index'
import Settings from '../pages/settings/Index'
import KidsHub from '../pages/kids/KidsHub'
import VideoPlayer from '../pages/kids/VideoPlayer'
import Admin from '../pages/admin/Index'

// ── Helpers ───────────────────────────────────────────────────────────────

const roleDashboard: Record<Role, string> = {
  student: APP_ROUTES.DASHBOARD.STUDENT,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent: APP_ROUTES.DASHBOARD.PARENT,
  admin: APP_ROUTES.ADMIN,
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
        <Route path={APP_ROUTES.HOME} element={<GuestRoute><Landing /></GuestRoute>} />
        <Route path={APP_ROUTES.LOGIN} element={<GuestRoute><Login /></GuestRoute>} />
        <Route path={APP_ROUTES.REGISTER} element={<GuestRoute><Register /></GuestRoute>} />

        {/* Public — auth tələb olunmur */}
        <Route path={APP_ROUTES.PORTFOLIO(':link')} element={<PublicPortfolio />} />
        <Route path={APP_ROUTES.TEACHER(':slug')} element={<TeacherStorefront />} />

        {/* Portfolio — öz portfolio */}
        <Route path="/portfolio/me" element={<PW><MyPortfolio /></PW>} />

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

        {/* ── Parent alias route-ları ───────────────────────────── */}
        {/* Semantik URL-lər qalır, amma parent dashboard-a redirect olur.
            RoleRoute parent olmayan/giriş etməmiş user-i öz yerinə yönləndirir. */}
        <Route path="/child"            element={<RoleRoute roles={['parent']}><Navigate to={`${APP_ROUTES.DASHBOARD.PARENT}#child-section`} replace /></RoleRoute>} />
        <Route path="/progress"         element={<RoleRoute roles={['parent']}><Navigate to={`${APP_ROUTES.DASHBOARD.PARENT}#progress-section`} replace /></RoleRoute>} />
        <Route path="/attendance/child" element={<RoleRoute roles={['parent']}><Navigate to={`${APP_ROUTES.DASHBOARD.PARENT}#attendance-section`} replace /></RoleRoute>} />
        <Route path="/payments"         element={<RoleRoute roles={['parent']}><Navigate to={`${APP_ROUTES.DASHBOARD.PARENT}#payments-section`} replace /></RoleRoute>} />

        {/* ── Feature routes — hamısı PageWrapper ilə ──────────── */}
        <Route path={APP_ROUTES.DAILY} element={<ProtectedRoute><DailyQuiz /></ProtectedRoute>} />
        <Route path="/competition" element={<PW><CompetitionJoin /></PW>} />
        <Route path="/competition/create" element={<RoleRoute roles={['teacher']}><PageWrapper><CompetitionCreate /></PageWrapper></RoleRoute>} />
        <Route path="/competition/:id" element={<PW><CompetitionRoom /></PW>} />
        <Route path="/competition/:id/lobby" element={<PW><CompetitionLobby /></PW>} />
        <Route path="/competition/:id/result" element={<PW><CompetitionResult /></PW>} />
        <Route path={APP_ROUTES.WEEKLY_MYSTERY} element={<PW><WeeklyMystery /></PW>} />
        <Route path="/clan/:slug" element={<PW><ClanPage /></PW>} />
        <Route path="/clan/:slug/battle/:battleId" element={<PW><ClanBattle /></PW>} />
        <Route path="/leaderboard/clans" element={<PW><ClanLeaderboard /></PW>} />
        <Route path={APP_ROUTES.COURSES} element={<PW><Courses /></PW>} />
        {/* /courses/create səhifəsi yoxdur — "create" id kimi qəbul olunub CourseDetail mock açmasın deyə
            /:id-dən ƏVVƏL kurslar səhifəsinə yönləndirilir. */}
        <Route path="/courses/create" element={<Navigate to={APP_ROUTES.COURSES} replace />} />
        <Route path="/courses/:id" element={<PW><CourseDetail /></PW>} />
        {/* Müəllim sinif indeksi — /classroom/:id-dən ƏVVƏL (exact match) */}
        <Route path="/classroom" element={<RoleRoute roles={['teacher']}><PageWrapper><TeacherClassroomIndex /></PageWrapper></RoleRoute>} />
        <Route path="/classroom/:id" element={<PW><ClassroomRoom /></PW>} />
        <Route path="/classroom/:id/qr" element={<ProtectedRoute><AttendanceQR /></ProtectedRoute>} />
        <Route path="/child/:childId/progress" element={<PW><ChildProgress /></PW>} />
        <Route path="/groups" element={<PW><GroupManagement /></PW>} />
        {/* Müəllim davamiyyət baxışı */}
        <Route path="/attendance" element={<RoleRoute roles={['teacher']}><PageWrapper><TeacherAttendance /></PageWrapper></RoleRoute>} />
        <Route path="/analytics" element={<PW><TeacherAnalytics /></PW>} />
        <Route path={APP_ROUTES.CHAT} element={<PW><Chat /></PW>} />
        <Route path={APP_ROUTES.SETTINGS} element={<PW><Settings /></PW>} />
        <Route path={APP_ROUTES.KIDS_HUB} element={<KidsRoute><PageWrapper><KidsHub /></PageWrapper></KidsRoute>} />
        <Route path="/kids/:id" element={<KidsRoute><PageWrapper><VideoPlayer /></PageWrapper></KidsRoute>} />




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
