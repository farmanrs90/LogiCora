import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { setCredentials } from '../../features/auth/authSlice'
import { APP_ROUTES } from '../../constants'
import { loginSchema, type LoginValues } from '../../schemas/auth'
import type { AppDispatch } from '../../app/store'
import type { ApiError } from '../../types'

export default function Login() {
  const dispatch = useDispatch<AppDispatch>()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched', // sahədən çıxanda (blur) yoxlayır — yazarkən deyil
  })

  // Bura YALNIZ validation keçəndən sonra çatır → values təmiz və düzgündür
  async function onSubmit(values: LoginValues) {
    try {
      const authData = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      dispatch(setCredentials({ user: authData.user, token: authData.accessToken }))
      toast.success(`Xoş gəldin, ${authData.user.name}! 👋`)
      navigate(APP_ROUTES.DASHBOARD.ROOT, { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      const msg = apiErr.status === 401
        ? 'Email və ya şifrə yanlışdır'
        : apiErr.message || 'Giriş alınmadı. Yenidən cəhd et.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4 relative overflow-hidden">

      <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-[#3B82F6] opacity-[0.07] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-[#9333EA] opacity-[0.07] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
        className="w-full max-w-md z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">
            LogiCora
          </h1>
          <p className="text-[#9CA3AF] mt-2 text-sm">Bilikdə güc, gələcəkdə iz.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-7">
            <motion.span
              className="text-3xl shrink-0" role="img" aria-label="Logi"
              animate={{ rotate: [0, 12, 0, -8, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }}
            >
              🤖
            </motion.span>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Xoş gəldin!</h2>
              <p className="text-[#9CA3AF] text-sm">Hesabına daxil ol</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                placeholder="məsələn: ad@mail.com"
                className={`input focus:ring-2 ${errors.email ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'focus:ring-[#06B6D4]'}`}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[#EF4444] text-xs mt-1.5" role="alert">
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Şifrə</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Şifrəni yaz"
                  className={`input pr-12 focus:ring-2 ${errors.password ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'focus:ring-[#06B6D4]'}`}
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                  aria-label={showPass ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[#EF4444] text-xs mt-1.5" role="alert">
                  {errors.password.message}
                </motion.p>
              )}
            </div>
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => toast('Şifrə bərpası tezliklə əlavə olunacaq 🔑', { icon: '🔜' })}
                className="text-xs text-[#9CA3AF] hover:text-[#06B6D4] transition-colors"
              >
                Şifrəni unutdum?
              </button>
            </div>
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.015 } : {}}
              whileTap={!isSubmitting ? { scale: 0.985 } : {}}
              className="w-full py-3 rounded-[var(--radius-btn)] font-bold text-white text-base
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_4px_24px_rgba(147,51,234,0.3)] transition-shadow
                         hover:shadow-[0_4px_32px_rgba(147,51,234,0.5)]"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' as const }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Giriş edilir...
                </span>
              ) : 'Daxil ol'}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
            <span className="text-[#6B7280] text-xs tracking-widest">yaxud</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          </div>

          <button
            type="button"
            onClick={() => toast('Google giriş tezliklə əlavə olunacaq 🔜', { icon: '🌐' })}
            className="w-full py-3 rounded-[var(--radius-btn)] border border-[rgba(255,255,255,0.12)]
                       bg-[rgba(255,255,255,0.04)] text-white font-medium text-sm
                       hover:bg-[rgba(255,255,255,0.08)] transition-colors flex items-center justify-center gap-3 relative"
          >
            <span className="text-xl" role="img" aria-label="Google">🌐</span>
            Google ilə daxil ol
            <span className="absolute right-3 text-[10px] text-[#6B7280] border border-[#6B7280]/40 rounded-full px-2 py-0.5">tezliklə</span>
          </button>

          <p className="text-center text-sm text-[#9CA3AF] mt-6">
            Hesabın yoxdur?{' '}
            <Link to={APP_ROUTES.REGISTER} className="text-[#9333EA] font-semibold hover:text-[#a855f7] transition-colors">
              Qeydiyyat
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
