import { useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { setCredentials } from '../../features/auth/authSlice'
import { APP_ROUTES } from '../../constants'
import type { AppDispatch } from '../../app/store'
import type { AgeGroup, ApiError } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────

type RegisterRole = 'student' | 'teacher' | 'parent'
type Direction    = 1 | -1

interface FormState {
  name:            string
  surname:         string
  email:           string
  password:        string
  confirmPassword: string
  phone:           string
  sinif:           string
  specialty:       string
  experience:      string
}

interface FieldError {
  name?:            string
  surname?:         string
  email?:           string
  password?:        string
  confirmPassword?: string
  phone?:           string
  sinif?:           string
  specialty?:       string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function gradeToAgeGroup(grade: string): AgeGroup {
  const g = parseInt(grade, 10)
  if (g <= 3)  return '6-8'
  if (g <= 6)  return '9-11'
  if (g <= 8)  return '12-14'
  if (g <= 10) return '15-17'
  return '18-22'
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateStep2(form: FormState, role: RegisterRole): FieldError {
  const err: FieldError = {}
  if (!form.name.trim())    err.name    = 'Ad daxil et'
  if (!form.surname.trim()) err.surname = 'Soyad daxil et'
  if (!form.email.trim() || !validateEmail(form.email)) err.email = 'Düzgün email daxil et'
  if (form.password.length < 6)  err.password = 'Şifrə minimum 6 simvol'
  if (form.password !== form.confirmPassword) err.confirmPassword = 'Şifrələr uyğun gəlmir'
  if (role === 'parent'  && !form.phone.trim())     err.phone     = 'Telefon daxil et'
  if (role === 'student' && !form.sinif)            err.sinif     = 'Sinif seç'
  if (role === 'teacher' && !form.specialty.trim()) err.specialty = 'İxtisas daxil et'
  return err
}

// ── Animation variants ────────────────────────────────────────────────────

const slide = {
  enter: (dir: Direction) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:   (dir: Direction) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0, transition: { duration: 0.3 } }),
}

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const popIn = {
  hidden:  { opacity: 0, scale: 0.88, y: 18 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.42, ease: 'easeOut' } },
}

// ── Role card data ────────────────────────────────────────────────────────

const ROLE_CARDS: {
  role: RegisterRole
  icon: string
  title: string
  desc: string
  gradient: string
  glow: string
}[] = [
  {
    role: 'student',
    icon: '🎓',
    title: 'Tələbə',
    desc: 'Öyrən, yarış, böyü',
    gradient: 'from-[#3B82F6] to-[#9333EA]',
    glow: 'rgba(59,130,246,0.3)',
  },
  {
    role: 'teacher',
    icon: '📚',
    title: 'Müəllim',
    desc: 'İdarə et, inkişaf et',
    gradient: 'from-[#059669] to-[#0D9488]',
    glow: 'rgba(5,150,105,0.3)',
  },
  {
    role: 'parent',
    icon: '👪',
    title: 'Valideyn',
    desc: 'İzlə, dəstəklə',
    gradient: 'from-[#F97316] to-[#EF4444]',
    glow: 'rgba(249,115,22,0.3)',
  },
]

const ROLE_LABELS: Record<RegisterRole, string> = {
  student: 'Tələbə',
  teacher: 'Müəllim',
  parent:  'Valideyn',
}

// ── Progress bar ──────────────────────────────────────────────────────────

function RegProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={
                step === n
                  ? { backgroundColor: '#9333EA', scale: 1.3 }
                  : step > n
                  ? { backgroundColor: '#58CC02', scale: 1 }
                  : { backgroundColor: 'rgba(255,255,255,0.15)', scale: 1 }
              }
              transition={{ duration: 0.3 }}
              className="w-3 h-3 rounded-full"
            />
            {step === n && (
              <motion.div
                className="absolute w-5 h-5 rounded-full border-2 border-[#9333EA]"
                animate={{ opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          {n < 3 && (
            <div
              className="w-8 h-px transition-all duration-500"
              style={{ backgroundColor: step > n ? '#58CC02' : 'rgba(255,255,255,0.15)' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────────────────

function Field({
  id, label, type = 'text', value, onChange, placeholder, error, children,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input ${error ? 'border-[#EF4444] focus:ring-[#EF4444]' : 'focus:ring-[#06B6D4]'}`}
          aria-describedby={error ? `${id}-err` : undefined}
          aria-invalid={!!error}
        />
        {children}
      </div>
      {error && (
        <motion.p
          id={`${id}-err`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[#EF4444] text-xs mt-1"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// ── Step 1 — Role selection ───────────────────────────────────────────────

function Step1RoleCard({
  card, selected, onSelect,
}: {
  card: typeof ROLE_CARDS[0]
  selected: boolean
  onSelect: () => void
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10])

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width  - 0.5)
    mouseY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }
  function onLeave() { mouseX.set(0); mouseY.set(0) }

  return (
    <motion.div
      ref={ref}
      variants={popIn}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      animate={selected
        ? { scale: 1.06, boxShadow: `0 16px 48px ${card.glow}` }
        : { scale: 1,    boxShadow: '0 0 0 rgba(0,0,0,0)' }
      }
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`cursor-pointer rounded-2xl p-6 border-2 flex flex-col items-center gap-4 text-center select-none
                  transition-colors duration-200 outline-none
                  ${selected
                    ? 'border-[rgba(147,51,234,0.6)] bg-[rgba(147,51,234,0.1)]'
                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient}
                       flex items-center justify-center text-3xl shadow-lg`}>
        {card.icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">{card.title}</h3>
        <p className="text-[#9CA3AF] text-xs mt-0.5">{card.desc}</p>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${card.gradient}`}
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  )
}

function Step1({ role, onSelect }: { role: RegisterRole | null; onSelect: (r: RegisterRole) => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white">
          Sən{' '}
          <span className="bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">
            kimsən?
          </span>
        </h2>
        <p className="text-[#9CA3AF] mt-2 text-sm">Rolunu seç — davam et</p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full"
        style={{ perspective: 1000 }}
      >
        {ROLE_CARDS.map((card) => (
          <Step1RoleCard
            key={card.role}
            card={card}
            selected={role === card.role}
            onSelect={() => onSelect(card.role)}
          />
        ))}
      </motion.div>

      <p className="text-[#9CA3AF] text-sm">
        Artıq hesabın var?{' '}
        <Link to={APP_ROUTES.LOGIN} className="text-[#9333EA] font-semibold hover:underline">
          Daxil ol
        </Link>
      </p>
    </div>
  )
}

// ── Step 2 — Form fields ──────────────────────────────────────────────────

function Step2({
  role, form, errors, onChange,
}: {
  role: RegisterRole
  form: FormState
  errors: FieldError
  onChange: (key: keyof FormState, value: string) => void
}) {
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const roleCard = ROLE_CARDS.find((c) => c.role === role)!

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Role badge */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient}
                         flex items-center justify-center text-xl shrink-0`}>
          {roleCard.icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Məlumatlarını daxil et</h2>
          <p className="text-[#9CA3AF] text-xs">{roleCard.title} kimi qeydiyyat</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="name"    label="Ad"    value={form.name}    onChange={(v) => onChange('name', v)}    placeholder="Adın"    error={errors.name} />
        <Field id="surname" label="Soyad" value={form.surname} onChange={(v) => onChange('surname', v)} placeholder="Soyadın" error={errors.surname} />
      </div>

      <Field id="email" label="Email" type="email" value={form.email} onChange={(v) => onChange('email', v)} placeholder="email@example.com" error={errors.email} />

      {/* Password */}
      <Field id="password" label="Şifrə" type={showPass ? 'text' : 'password'} value={form.password} onChange={(v) => onChange('password', v)} placeholder="Minimum 6 simvol" error={errors.password}>
        <button type="button" onClick={() => setShowPass((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
          aria-label={showPass ? 'Gizlət' : 'Göstər'}>
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </Field>

      {/* Confirm password */}
      <Field id="confirmPass" label="Şifrəni təkrar et" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={(v) => onChange('confirmPassword', v)} placeholder="Şifrəni təkrar yaz" error={errors.confirmPassword}>
        <button type="button" onClick={() => setShowConfirm((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
          aria-label={showConfirm ? 'Gizlət' : 'Göstər'}>
          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </Field>

      {/* Role-specific fields */}
      {role === 'student' && (
        <div>
          <label htmlFor="sinif" className="label">Sinif</label>
          <select
            id="sinif"
            value={form.sinif}
            onChange={(e) => onChange('sinif', e.target.value)}
            className={`input ${errors.sinif ? 'border-[#EF4444]' : ''}`}
            aria-invalid={!!errors.sinif}
          >
            <option value="">Sinfi seç...</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={String(g)}>{g}-ci sinif</option>
            ))}
          </select>
          {errors.sinif && <p className="text-[#EF4444] text-xs mt-1" role="alert">{errors.sinif}</p>}
        </div>
      )}

      {role === 'teacher' && (
        <div className="grid grid-cols-2 gap-4">
          <Field id="specialty" label="İxtisas" value={form.specialty} onChange={(v) => onChange('specialty', v)} placeholder="Riyaziyyat, Fizika..." error={errors.specialty} />
          <Field id="experience" label="Təcrübə (il)" type="number" value={form.experience} onChange={(v) => onChange('experience', v)} placeholder="5" />
        </div>
      )}

      {role === 'parent' && (
        <Field id="phone" label="Telefon" type="tel" value={form.phone} onChange={(v) => onChange('phone', v)} placeholder="+994 50 000 00 00" error={errors.phone} />
      )}
    </div>
  )
}

// ── Step 3 — Summary + submit ─────────────────────────────────────────────

function Step3({
  role, form, isLoading, onSubmit,
}: {
  role: RegisterRole
  form: FormState
  isLoading: boolean
  onSubmit: () => void
}) {
  const roleCard = ROLE_CARDS.find((c) => c.role === role)!

  const summaryRows: { label: string; value: string }[] = [
    { label: 'Ad Soyad', value: `${form.name} ${form.surname}` },
    { label: 'Email',    value: form.email },
    ...(role === 'student' ? [{ label: 'Sinif', value: `${form.sinif}-ci sinif` }] : []),
    ...(role === 'teacher' ? [
      { label: 'İxtisas',   value: form.specialty },
      { label: 'Təcrübə',   value: form.experience ? `${form.experience} il` : '—' },
    ] : []),
    ...(role === 'parent' ? [{ label: 'Telefon', value: form.phone }] : []),
  ]

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">
          Məlumatlarını{' '}
          <span className="bg-gradient-to-r from-[#58CC02] to-[#06B6D4] bg-clip-text text-transparent">
            təsdiqlə
          </span>
        </h2>
        <p className="text-[#9CA3AF] text-sm mt-1">Hər şey düzdürsə, başla!</p>
      </div>

      {/* Summary card */}
      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-5 space-y-3">
        {/* Role badge */}
        <div className="flex items-center gap-3 pb-3 border-b border-[rgba(255,255,255,0.08)]">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient} flex items-center justify-center text-xl`}>
            {roleCard.icon}
          </div>
          <span className="text-white font-bold">{ROLE_LABELS[role]}</span>
        </div>

        {summaryRows.map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="text-[#9CA3AF] text-sm">{row.label}</span>
            <span className="text-white text-sm font-medium">{row.value}</span>
          </div>
        ))}
      </div>

      <motion.button
        onClick={onSubmit}
        disabled={isLoading}
        whileHover={!isLoading ? { scale: 1.015 } : {}}
        whileTap={!isLoading ? { scale: 0.985 } : {}}
        className="w-full py-3.5 rounded-[var(--radius-btn)] font-bold text-white text-base
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-[0_4px_24px_rgba(88,204,2,0.25)] transition-shadow"
        style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #9333EA 100%)' }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Qeydiyyat...
          </span>
        ) : '🚀 Qeydiyyatı tamamla'}
      </motion.button>
    </div>
  )
}

// ── Main Register ─────────────────────────────────────────────────────────

const AFTER_REGISTER: Record<RegisterRole, string> = {
  student: APP_ROUTES.ONBOARDING,
  teacher: APP_ROUTES.DASHBOARD.TEACHER,
  parent:  APP_ROUTES.DASHBOARD.PARENT,
}

export default function Register() {
  const dispatch   = useDispatch<AppDispatch>()
  const { register } = useAuth()
  const navigate   = useNavigate()
  const [searchParams] = useSearchParams()

  const initialRole = (searchParams.get('role') as RegisterRole | null) ?? null

  const [step, setStep]       = useState<1 | 2 | 3>(initialRole ? 2 : 1)
  const [direction, setDir]   = useState<Direction>(1)
  const [role, setRole]       = useState<RegisterRole | null>(initialRole)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors]   = useState<FieldError>({})

  const [form, setFormRaw] = useState<FormState>({
    name: '', surname: '', email: '', password: '',
    confirmPassword: '', phone: '', sinif: '', specialty: '', experience: '',
  })

  function setForm(key: keyof FormState, value: string) {
    setFormRaw((prev) => ({ ...prev, [key]: value }))
    if (errors[key as keyof FieldError]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function go(next: 1 | 2 | 3, dir: Direction) {
    setDir(dir)
    setStep(next)
  }

  function handleRoleSelect(r: RegisterRole) {
    setRole(r)
    go(2, 1)
  }

  function handleStep2Next() {
    if (!role) return
    const errs = validateStep2(form, role)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Zəhmət olmasa bütün sahələri düzgün doldurun.')
      return
    }
    setErrors({})
    go(3, 1)
  }

  async function handleSubmit() {
    if (!role || isLoading) return
    setIsLoading(true)
    try {
      const ageGroup: AgeGroup =
        role === 'student' ? gradeToAgeGroup(form.sinif) : '23+'

      const authData = await register({
        name:     form.name.trim(),
        surname:  form.surname.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        phone:    form.phone.trim(),
        role,
        ageGroup,
      })

      dispatch(setCredentials({ user: authData.user, token: authData.accessToken }))
      toast.success(`Xoş gəldin, ${authData.user.name}! 🎉`)
      navigate(AFTER_REGISTER[role], { replace: true })
    } catch (err) {
      const apiErr = err as ApiError
      toast.error(apiErr.message || 'Qeydiyyat uğursuz oldu. Yenidən cəhd et.')
    } finally {
      setIsLoading(false)
    }
  }

  const stepTitles: Record<number, string> = { 1: 'Rol seçimi', 2: 'Məlumatlar', 3: 'Təsdiq' }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#9333EA] opacity-[0.06] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#3B82F6] opacity-[0.06] blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-black bg-gradient-to-r from-[#3B82F6] to-[#9333EA] bg-clip-text text-transparent">
            LogiCora
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">{stepTitles[step]}</p>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[rgba(255,255,255,0.05)] backdrop-blur-xl
                     border border-[rgba(255,255,255,0.1)] rounded-2xl p-8"
        >
          <RegProgressBar step={step} />

          {/* Back button */}
          {step > 1 && (
            <button
              onClick={() => go(step === 3 ? 2 : 1, -1)}
              className="flex items-center gap-1 text-[#9CA3AF] hover:text-white
                         transition-colors text-sm mb-4"
              aria-label="Geri qayıt"
            >
              <ChevronLeft size={16} />
              Geri
            </button>
          )}

          {/* Step content */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {step === 1 && (
                  <Step1 role={role} onSelect={handleRoleSelect} />
                )}
                {step === 2 && role && (
                  <>
                    <Step2 role={role} form={form} errors={errors} onChange={setForm} />
                    <motion.button
                      onClick={handleStep2Next}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3 rounded-[var(--radius-btn)] font-bold text-white mt-6
                                 shadow-[0_4px_20px_rgba(147,51,234,0.25)]"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #9333EA)' }}
                    >
                      Davam et →
                    </motion.button>
                  </>
                )}
                {step === 3 && role && (
                  <Step3 role={role} form={form} isLoading={isLoading} onSubmit={handleSubmit} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {step === 1 && (
            <p className="text-center text-sm text-[#9CA3AF] mt-6">
              Artıq hesabın var?{' '}
              <Link to={APP_ROUTES.LOGIN} className="text-[#9333EA] font-semibold hover:underline">
                Daxil ol
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
