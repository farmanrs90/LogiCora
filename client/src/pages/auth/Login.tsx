import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check } from 'lucide-react'
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

// Dəyər paneli — fake statistika yoxdur, yalnız real platforma dəyərləri
const VALUE_POINTS = [
  'Şagird, müəllim və valideyn üçün vahid platforma',
  'Portfolio, gündəlik quiz və adaptiv öyrənmə',
  'Yarışlar, kurslar və Education Passport',
]

// Light input/label stilləri (qlobal .input/.label dark olduğu üçün burada inline)
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputCls = (err?: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 ${
    err
      ? 'border-red-400 focus-visible:ring-red-400'
      : 'border-gray-300 hover:border-gray-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500'
  }`

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

  // Whitespace guard — email/şifrə input-larını canlı təmizləyir (uncontrolled RHF).
  const emailReg = register('email')
  const passwordReg = register('password')

  // Bura YALNIZ validation keçəndən sonra çatır → values təmiz və düzgündür
  async function onSubmit(values: LoginValues) {
    try {
      const authData = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password, // şifrə dəyişdirilmir (boşluqlar istifadəçi niyyəti ola bilər)
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
    <div className="flex min-h-screen bg-white text-gray-900">

      {/* ── Value panel (desktop) ─────────────────────────────────────────── */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-600 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
          aria-hidden="true"
        />

        {/* Brand */}
        <div className="relative">
          <Link
            to={APP_ROUTES.HOME}
            className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="LogiCora ana səhifə"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <span className="h-3 w-3 rounded-sm bg-white" />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">LogiCora</span>
          </Link>
        </div>

        {/* Value props */}
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">3 yaşdan ömür boyu öyrənmə izi</h2>
          <p className="mt-4 max-w-md leading-relaxed text-indigo-100">
            LogiCora təhsilin bütün yolunu bir profildə birləşdirir.
          </p>
          <ul className="mt-8 space-y-4">
            {VALUE_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-indigo-50">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-indigo-100/80">Bilikdə güc, gələcəkdə iz.</p>
      </aside>

      {/* ── Form side ─────────────────────────────────────────────────────── */}
      <main className="flex w-full flex-col items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' as const }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="mb-8 text-center lg:hidden">
            <Link
              to={APP_ROUTES.HOME}
              className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="LogiCora ana səhifə"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
              </span>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-gray-900">Logi</span>
                <span className="text-indigo-600">Cora</span>
              </span>
            </Link>
            <p className="mt-2 text-sm text-gray-500">Bilikdə güc, gələcəkdə iz.</p>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Yenidən xoş gəldin</h1>
            <p className="mt-1 text-sm text-gray-500">Hesabına daxil ol</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input
                id="email"
                type="email"
                placeholder="məsələn: ad@mail.com"
                className={inputCls(!!errors.email)}
                aria-invalid={!!errors.email}
                {...emailReg}
                onChange={(e) => { e.target.value = e.target.value.replace(/\s/g, '').toLowerCase(); emailReg.onChange(e) }}
              />
              {errors.email && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelCls}>Şifrə</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Şifrəni yaz"
                  className={`${inputCls(!!errors.password)} pr-12`}
                  aria-invalid={!!errors.password}
                  {...passwordReg}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                  aria-label={showPass ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-500" role="alert">
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                disabled
                className="rounded text-xs font-medium text-gray-400 cursor-not-allowed"
              >
                Şifrə bərpası tezliklə
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.01 } : {}}
              whileTap={!isSubmitting ? { scale: 0.99 } : {}}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' as const }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                  />
                  Giriş edilir...
                </span>
              ) : 'Daxil ol'}
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs tracking-widest text-gray-400">yaxud</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="relative flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-medium text-gray-400"
          >
            <span className="text-lg" role="img" aria-label="Google">🌐</span>
            Google ilə giriş post-demo
            <span className="absolute right-3 rounded-full border border-gray-300 px-2 py-0.5 text-[10px] text-gray-400">tezliklə</span>
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Hesabın yoxdur?{' '}
            <Link
              to={APP_ROUTES.REGISTER}
              className="rounded font-semibold text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Qeydiyyat
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
