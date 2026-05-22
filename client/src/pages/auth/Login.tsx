import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ErrorMessage from '../../components/ErrorMessage'
import Spinner from '../../components/Spinner'
import { APP_ROUTES } from '../../constants'
import type { ApiError } from '../../types'

const Login = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    navigate(APP_ROUTES.DASHBOARD, { replace: true })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {

    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ email, password })
      navigate(APP_ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'Giriş uğursuz oldu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-violet-600 tracking-tight">
            LogiCora
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Biliklərin oyunlaşdırılmış platforması
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Hesabına daxil ol
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Şifrə</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <ErrorMessage message={error} />

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : 'Daxil ol'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Hesabın yoxdur?{' '}
            <Link
              to={APP_ROUTES.REGISTER}
              className="text-violet-600 font-medium hover:underline"
            >
              Qeydiyyat
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login
