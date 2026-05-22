import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'
import { APP_ROUTES } from '../constants'
import type { Role } from '../types'

interface Props {
  children: React.ReactNode
  allowedRoles?: Role[]
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={APP_ROUTES.DASHBOARD} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
