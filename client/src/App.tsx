import { AuthProvider } from './context/AuthContext'
import AppRouter from './router/Index'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
