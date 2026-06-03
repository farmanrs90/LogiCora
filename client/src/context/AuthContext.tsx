import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useDispatch } from 'react-redux'
import type { User, LoginInput, RegisterInput, AuthResponse } from '../types'
import { API_ROUTES } from '../constants'
import { setAvatarColor } from '../features/theme/themeSlice'
import { colorForCharacter } from '../lib/companion'
import type { AppDispatch } from '../app/store'
import api from '../lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginInput) => Promise<AuthResponse>
  register: (data: RegisterInput) => Promise<AuthResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const dispatch = useDispatch<AppDispatch>()

  // user-i həm state-ə yaz, həm avatarColor-u onun characterType-indən təzələ (tək yer)
  const applyUser = (u: User | null) => {
    setUser(u)
    dispatch(setAvatarColor(colorForCharacter(u?.characterType)))
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await api.get(API_ROUTES.USER.PROFILE)
      applyUser(data.data)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (input: LoginInput): Promise<AuthResponse> => {
    const { data } = await api.post<{ data: AuthResponse }>(API_ROUTES.AUTH.LOGIN, input)
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    applyUser(data.data.user)
    return data.data
  }

  const register = async (input: RegisterInput): Promise<AuthResponse> => {
    const { data } = await api.post<{ data: AuthResponse }>(API_ROUTES.AUTH.REGISTER, input)
    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    applyUser(data.data.user)
    return data.data
  }

  const logout = () => {
    api.post(API_ROUTES.AUTH.LOGOUT).catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    applyUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
