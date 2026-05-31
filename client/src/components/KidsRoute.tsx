import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_ROUTES } from '../constants'
import type { Role } from '../types'
import Spinner from './Spinner'

// Uşaq Klubu yalnız kiçik yaş tələbələri üçündür
const KID_AGES = ['3-5', '6-8']

const roleDashboard: Record<Role, string> = {
  student: APP_ROUTES.DASHBOARD.STUDENT,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent:  APP_ROUTES.DASHBOARD.PARENT,
  admin:   APP_ROUTES.ADMIN,
  manager: APP_ROUTES.DASHBOARD.ROOT,
}

const KidsRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />
  }

  // Yalnız BÖYÜK yaş tələbəsini blokla → öz dashboard-una at.
  // Müəllim/valideyn/admin önizləyə bilər, ona görə yalnız 'student' yoxlanır.
  if (user.role === 'student' && !KID_AGES.includes(user.ageGroup)) {
    return <Navigate to={roleDashboard[user.role]} replace />
  }

  return <>{children}</>
}

export default KidsRoute
