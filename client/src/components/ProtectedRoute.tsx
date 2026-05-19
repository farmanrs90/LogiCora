import { Navigate } from 'react-router-dom'
import { TOKEN_KEY, ROUTES } from '../constants'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return <Navigate to={ROUTES.LOGIN} replace />
  return <>{children}</>
}

export default ProtectedRoute
