import axios from 'axios'
import type { ApiError } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Request interceptor — hər sorğuya token əlavə et
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — 401 gələndə refresh et
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Auth endpointlərinin (login/register/refresh) öz 401-i "sessiya bitdi" demək deyil —
    // bu, sadəcə yanlış email/şifrədir. Onları refresh+redirect məntiqinə salmırıq,
    // əks halda login səhifəsi reload olub formu silir.
    const isAuthEndpoint = typeof originalRequest?.url === 'string'
      && originalRequest.url.includes('/auth/')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        )

        const newAccessToken = data.data.accessToken
        localStorage.setItem('accessToken', newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return api(originalRequest)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    const apiError: ApiError = {
      message: error.response?.data?.message || 'Xəta baş verdi',
      status: error.response?.status || 500,
    }

    return Promise.reject(apiError)
  }
)

export default api
