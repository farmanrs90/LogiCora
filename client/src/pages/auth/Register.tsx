import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { setCredentials } from '../../features/auth/authSlice'
import { APP_ROUTES } from '../../constants'
import { registerSchema, type RegisterValues } from '../../schemas/auth'
import type { AppDispatch } from '../../app/store'
import type { AgeGroup, ApiError } from '../../types'

type RegisterRole = 'student' | 'teacher' | 'parent'
type Direction = 1 | -1

// Tələbə üçün yaş qrupu — sinif əvəzinə (3-5 boşluğu bağlanır)
const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: '3-5', label: '3-5 yaş (məktəbəqədər)' },
  { value: '6-8', label: '6-8 yaş (1-3 sinif)' },
  { value: '9-11', label: '9-11 yaş (4-6 sinif)' },
  { value: '12-14', label: '12-14 yaş (7-9 sinif)' },
  { value: '15-17', label: '15-17 yaş (10-12 sinif)' },
  { value: '18-22', label: '18-22 yaş (tələbə)' },
  { value: '23+', label: '23+ yaş' },
]

// ── Animation variants ────────────────────────────────────────────────────
const slide = {
  enter: (dir: Direction) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit: (dir: Direction) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0, transition: { duration: 0.3 } }),
}
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const popIn = { hidden: { opacity: 0, scale: 0.88, y: 18 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } } }

const ROLE_CARDS: { role: RegisterRole; icon: string; title: string; desc: string; gradient: string; glow: string }[] = [
  { role: 'student', icon: '🎓', title: 'Tələbə', desc: 'Öyrən, yarış, böyü', gradient: 'from-[#3B82F6] to-[#9333EA]', glow: 'rgba(59,130,246,0.3)' },
  { role: 'teacher', icon: '📚', title: 'Müəllim', desc: 'İdarə et, inkişaf et', gradient: 'from-[#059669] to-[#0D9488]', glow: 'rgba(5,150,105,0.3)' },
  { role: 'parent', icon: '👪', title: 'Valideyn', desc: 'İzlə, dəstəklə', gradient: 'from-[#F97316] to-[#EF4444]', glow: 'rgba(249,115,22,0.3)' },
]
const ROLE_LABELS: Record<RegisterRole, string> = { student: 'Tələbə', teacher: 'Müəllim', parent: 'Valideyn' }

// ── Progress bar ──────────────────────────────────────────────────────────
function RegProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={step === n ? { backgroundColor: '#9333EA', scale: 1.3 } : step > n ? { backgroundColor: '#58CC02', scale: 1 } : { backgroundColor: 'rgba(255,255,255,0.15)', scale: 1 }}
              transition={{ duration: 0.3 }} className="w-3 h-3 rounded-full"
            />
            {step === n && (
              <motion.div className="absolute w-5 h-5 rounded-full border-2 border-[#9333EA]"
                animate={{ opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} />
            )}
          </div>
          {n < 3 && <div className="w-8 h-px transition-all duration-500" style={{ backgroundColor: step > n ? '#58CC02' : 'rgba(255,255,255,0.15)' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Field — RHF register-i qəbul edir ───────────────────────────────────────
function Field({ id, label, type = 'text', placeholder, error, registration, children }: {
  id: string; label: string; type?: string; placeholder?: string
  error?: string; registration: UseFormRegisterReturn; children?: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} type={type} placeholder={placeholder}
          className={`input ${error ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'focus:ring-[#06B6D4]'}`}
          aria-invalid={!!error} {...registration} />
        {children}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-[#EF4444] text-xs mt-1" role="alert">{error}</motion.p>
      )}
    </div>
  )
}

// ── Step 1 — role card (3D tilt) ────────────────────────────────────────────
function Step1RoleCard({ card, selected, onSelect }: { card: typeof ROLE_CARDS[0]; selected: boolean; onSelect: () => void }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10])

  return (
    <motion.div
      variants={popIn}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mouseX.set((e.clientX - r.left) / r.width - 0.5)
        mouseY.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      animate={selected ? { scale: 1.06, boxShadow: `0 16px 48px ${card.glow}` } : { scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`cursor-pointer rounded-2xl p-6 border-2 flex flex-col items-center gap-4 text-center select-none transition-colors duration-200 outline-none ${selected ? 'border-[rgba(147,51,234,0.6)] bg-[rgba(147,51,234,0.1)]' : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)]'}`}
      role="radio" aria-checked={selected} tabIndex={0}
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-3xl shadow-lg`}>{card.icon}</div>
      <div>
        <h3 className="text-white font-bold text-lg">{card.title}</h3>
        <p className="text-[#9CA3AF] text-xs mt-0.5">{card.desc}</p>
      </div>
      {selected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${card.gradient}`}>✓</motion.div>
      )}
    </motion.div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
const AFTER_REGISTER: Record<RegisterRole, string> = {
  student: APP_ROUTES.ONBOARDING,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent: APP_ROUTES.DASHBOARD.PARENT,
}

export default function Register() {
  const dispatch = useDispatch<AppDispatch>()
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialRole = (searchParams.get('role') as RegisterRole | null) ?? null
  const guide = searchParams.get('guide') as 'logi' | 'cora' | null

  const [step, setStep] = useState<1 | 2 | 3>(initialRole ? 2 : 1)
  const [direction, setDir] = useState<Direction>(1)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      role: initialRole ?? undefined,
      name: '', surname: '', email: '', phone: '',
      password: '', confirmPassword: '', specialty: '', experience: '',
    },
  })

  // Email/şifrə üçün whitespace guard — input dəyərini canlı təmizləyir (uncontrolled RHF).
  const sanitize = (reg: UseFormRegisterReturn, lower = false): UseFormRegisterReturn => ({
    ...reg,
    onChange: (e) => {
      const t = e.target as HTMLInputElement
      t.value = lower ? t.value.replace(/\s/g, '').toLowerCase() : t.value.replace(/\s/g, '')
      return reg.onChange(e)
    },
  })

  const role = watch('role') as RegisterRole | undefined
  const values = watch()

  function go(next: 1 | 2 | 3, dir: Direction) { setDir(dir); setStep(next) }

  function handleRoleSelect(r: RegisterRole) {
    setValue('role', r)
    go(2, 1)
  }

  async function handleStep2Next() {
    const ok = await trigger() // bütün sxemi yoxla (şərti sahələr daxil)
    if (ok) go(3, 1)
    else toast.error('Zəhmət olmasa sahələri düzgün doldur')
  }

  async function onSubmit(data: RegisterValues) {
    try {
      const ageGroup: AgeGroup = data.role === 'student' ? (data.ageGroup as AgeGroup) : '23+'
      const authData = await registerUser({
        name: data.name.trim(),
        surname: data.surname.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password.trim(),
        phone: data.phone.trim(),
        role: data.role,
        ageGroup,
      })
      dispatch(setCredentials({ user: authData.user, token: authData.accessToken }))
      toast.success(`Xoş gəldin, ${authData.user.name}! 🎉`)
      navigate(AFTER_REGISTER[data.role], { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      const msg = apiErr.status === 409
        ? 'Bu email və ya telefon artıq qeydiyyatdadır'
        : apiErr.message || 'Qeydiyyat alınmadı. Yenidən cəhd et.'
      toast.error(msg)
    }
  }

  const stepTitles: Record<number, string> = { 1: 'Rol seçimi', 2: 'Məlumatlar', 3: 'Təsdiq' }
  const roleCard = role ? ROLE_CARDS.find((c) => c.role === role)! : null

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ backgroundColor: guide === 'logi' ? '#3B82F6' : '#9333EA' }} />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ backgroundColor: guide === 'cora' ? '#9333EA' : '#3B82F6' }} />

      {guide && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className={`absolute top-4 z-20 flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${guide === 'logi' ? 'left-4 border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]' : 'right-4 border-[#9333EA]/30 bg-[#9333EA]/10 text-[#9333EA]'}`}>
          <motion.span animate={guide === 'logi' ? { y: [0, -4, 0] } : { rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            {guide === 'logi' ? '🤖' : '🪄'}
          </motion.span>
          {guide === 'logi' ? 'Logi səni gözləyir!' : 'Cora səni gözləyir!'}
        </motion.div>
      )}

      <div className="w-full max-w-lg z-10">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">LogiCora</h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{stepTitles[step]}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl p-8">
          <RegProgressBar step={step} />

          {step > 1 && (
            <button onClick={() => go(step === 3 ? 2 : 1, -1)}
              className="flex items-center gap-1 text-[#9CA3AF] hover:text-white transition-colors text-sm mb-4" aria-label="Geri qayıt">
              <ChevronLeft size={16} /> Geri
            </button>
          )}

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={step} custom={direction} variants={slide} initial="enter" animate="center" exit="exit">

                {/* STEP 1 — rol */}
                {step === 1 && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-white">Sən <span className="bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">kimsən?</span></h2>
                      <p className="text-[#9CA3AF] mt-2 text-sm">Rolunu seç — davam et</p>
                    </div>
                    <motion.div variants={stagger} initial="hidden" animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full" style={{ perspective: 1000 }}>
                      {ROLE_CARDS.map((card) => (
                        <Step1RoleCard key={card.role} card={card} selected={role === card.role} onSelect={() => handleRoleSelect(card.role)} />
                      ))}
                    </motion.div>
                    <p className="text-center text-sm text-[#9CA3AF] mt-2">
                      Artıq hesabın var?{' '}
                      <Link to={APP_ROUTES.LOGIN} className="text-[#9333EA] font-semibold hover:underline">Daxil ol</Link>
                    </p>
                  </div>
                )}

                {/* STEP 2 — sahələr */}
                {step === 2 && role && roleCard && (
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient} flex items-center justify-center text-xl shrink-0`}>{roleCard.icon}</div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Məlumatlarını daxil et</h2>
                        <p className="text-[#9CA3AF] text-xs">{roleCard.title} kimi qeydiyyat</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field id="name" label="Ad" placeholder="Adın" error={errors.name?.message} registration={register('name')} />
                      <Field id="surname" label="Soyad" placeholder="Soyadın" error={errors.surname?.message} registration={register('surname')} />
                    </div>

                    <Field id="email" label="Email" type="email" placeholder="məsələn: ad@mail.com" error={errors.email?.message} registration={sanitize(register('email'), true)} />
                    <Field id="phone" label="Telefon" type="tel" placeholder="+994 50 000 00 00" error={errors.phone?.message} registration={register('phone')} />

                    <Field id="password" label="Şifrə" type={showPass ? 'text' : 'password'} placeholder="Minimum 6 simvol" error={errors.password?.message} registration={sanitize(register('password'))}>
                      <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white" aria-label="Göstər/gizlət">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </Field>

                    <Field id="confirmPass" label="Şifrəni təkrar et" type={showConfirm ? 'text' : 'password'} placeholder="Şifrəni təkrar yaz" error={errors.confirmPassword?.message} registration={sanitize(register('confirmPassword'))}>
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white" aria-label="Göstər/gizlət">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </Field>

                    {/* Tələbə → yaş qrupu */}
                    {role === 'student' && (
                      <div>
                        <label htmlFor="ageGroup" className="label">Yaş qrupu</label>
                        <select id="ageGroup" className={`input ${errors.ageGroup ? 'border-[#EF4444]' : ''}`} {...register('ageGroup')}>
                          <option value="">Yaş qrupunu seç...</option>
                          {AGE_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {errors.ageGroup && <p className="text-[#EF4444] text-xs mt-1" role="alert">{errors.ageGroup.message}</p>}
                      </div>
                    )}

                    {/* Müəllim → ixtisas + təcrübə */}
                    {role === 'teacher' && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field id="specialty" label="İxtisas" placeholder="Riyaziyyat..." error={errors.specialty?.message} registration={register('specialty')} />
                        <Field id="experience" label="Təcrübə (il)" type="number" placeholder="5" registration={register('experience')} />
                      </div>
                    )}

                    <motion.button onClick={handleStep2Next} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full py-3 rounded-[var(--radius-btn)] font-bold text-white mt-1 shadow-[0_4px_20px_rgba(147,51,234,0.25)]"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #9333EA)' }}>Davam et →</motion.button>
                  </div>
                )}

                {/* STEP 3 — təsdiq */}
                {step === 3 && role && roleCard && (
                  <div className="flex flex-col gap-6 w-full">
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-white">Məlumatlarını <span className="bg-gradient-to-r from-[#58CC02] to-[#06B6D4] bg-clip-text text-transparent">təsdiqlə</span></h2>
                      <p className="text-[#9CA3AF] text-sm mt-1">Hər şey düzdürsə, başla!</p>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-3 pb-3 border-b border-[rgba(255,255,255,0.08)]">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient} flex items-center justify-center text-xl`}>{roleCard.icon}</div>
                        <span className="text-white font-bold">{ROLE_LABELS[role]}</span>
                      </div>
                      {[
                        { label: 'Ad Soyad', value: `${values.name} ${values.surname}` },
                        { label: 'Email', value: values.email },
                        { label: 'Telefon', value: values.phone },
                        ...(role === 'student' ? [{ label: 'Yaş qrupu', value: AGE_GROUP_OPTIONS.find((o) => o.value === values.ageGroup)?.label ?? '—' }] : []),
                        ...(role === 'teacher' ? [{ label: 'İxtisas', value: values.specialty || '—' }] : []),
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center">
                          <span className="text-[#9CA3AF] text-sm">{row.label}</span>
                          <span className="text-white text-sm font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <motion.button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
                      whileHover={!isSubmitting ? { scale: 1.015 } : {}} whileTap={!isSubmitting ? { scale: 0.985 } : {}}
                      className="w-full py-3.5 rounded-[var(--radius-btn)] font-bold text-white text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(88,204,2,0.25)]"
                      style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)' }}>
                      {isSubmitting ? 'Qeydiyyat...' : '🚀 Qeydiyyatı tamamla'}
                    </motion.button>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
