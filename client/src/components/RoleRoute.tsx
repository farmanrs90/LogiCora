import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_ROUTES } from '../constants'
import type { Role } from '../types'
import Spinner from './Spinner'

interface Props {
  children: React.ReactNode
  roles: Role[]
}

const roleDashboard: Record<Role, string> = {
  student: APP_ROUTES.DASHBOARD.STUDENT,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent: APP_ROUTES.DASHBOARD.PARENT,
  admin: APP_ROUTES.ADMIN,
  manager: APP_ROUTES.DASHBOARD.ROOT,
}

const RoleRoute = ({ children, roles }: Props) => {
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

  if (!roles.includes(user.role)) {
    return <Navigate to={roleDashboard[user.role]} replace />
  }

  return <>{children}</>
}

export default RoleRoute
