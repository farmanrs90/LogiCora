import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Eye, EyeOff, ChevronLeft, Check, X } from 'lucide-react'
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

// ── Animation variants ────────────────────────────────────────────────────
const slide = {
  enter: (dir: Direction) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit: (dir: Direction) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0, transition: { duration: 0.3 } }),
}
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const popIn = { hidden: { opacity: 0, scale: 0.88, y: 18 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } } }

const ROLE_CARDS: { role: RegisterRole; icon: string; title: string; desc: string; gradient: string; glow: string }[] = [
  { role: 'student', icon: '🎓', title: 'Tələbə', desc: 'Öyrən, yarış, böyü', gradient: 'from-indigo-500 to-blue-500', glow: 'rgba(79,70,229,0.25)' },
  { role: 'teacher', icon: '📚', title: 'Müəllim', desc: 'İdarə et, inkişaf et', gradient: 'from-emerald-500 to-teal-500', glow: 'rgba(16,185,129,0.22)' },
  { role: 'parent', icon: '👪', title: 'Valideyn', desc: 'İzlə, dəstəklə', gradient: 'from-amber-500 to-orange-500', glow: 'rgba(249,115,22,0.22)' },
]
const ROLE_LABELS: Record<RegisterRole, string> = { student: 'Tələbə', teacher: 'Müəllim', parent: 'Valideyn' }

// İstifadə şərtləri — MVP icmalı (LogiCora üçün yazılıb, xarici mətn kopyalanmayıb)
const TERMS_VERSION = '2026.06-mvp'
const TERMS_POINTS = [
  'LogiCora təhsil platformasıdır — şagird, müəllim və valideyn üçün öyrənmə, portfolio, gündəlik quiz, kurslar və yarışları bir yerdə təqdim edir.',
  'Qeydiyyat zamanı doğru və dəqiq məlumat verməyə razısan.',
  'Valideyn kimi, övladının xüsusi dəstək / adaptiv öyrənmə ayarlarını idarə edə bilərsən.',
  'Education Passport və ictimai portfolio görünüşü sənin öz tənzimləmələrinlə idarə olunur.',
  'Xüsusi dəstək / adaptiv öyrənmə məlumatı könüllüdür və tibbi diaqnoz deyil.',
  'Mesajlaşma hörmətli olmalıdır; rol və əlaqəyə görə məhdudlaşdırıla bilər.',
  'Sui-istifadə, spam və ya saxta hesablar məhdudlaşdırıla bilər.',
  'Məlumatlardan öyrənmə irəliləyişi, portfolio, quiz, kurslar və valideyn/müəllim görünüşü üçün istifadə olunur.',
  'Tam hüquqi siyasət demo-dan sonra genişləndiriləcək.',
]

// ── Terms modal (premium light) ─────────────────────────────────────────────
function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog" aria-modal="true" aria-labelledby="terms-title"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 id="terms-title" className="text-lg font-bold text-gray-900">LogiCora istifadə şərtləri</h2>
            <p className="mt-0.5 text-xs text-gray-500">Qısa MVP icmalı — tam hüquqi siyasət demo-dan sonra genişləndiriləcək.</p>
          </div>
          <button onClick={onClose} aria-label="Bağla"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          <p className="text-sm text-gray-600">LogiCora-da qeydiyyatdan keçməklə aşağıdakıları qəbul edirsən:</p>
          <ul className="space-y-2.5">
            {TERMS_POINTS.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
                  <Check size={12} />
                </span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-gray-100 p-4">
          <button onClick={onClose}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
            Anladım, bağla
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────
function RegProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3 justify-center mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={step === n ? { backgroundColor: '#4F46E5', scale: 1.3 } : step > n ? { backgroundColor: '#10B981', scale: 1 } : { backgroundColor: '#D1D5DB', scale: 1 }}
              transition={{ duration: 0.3 }} className="w-3 h-3 rounded-full"
            />
            {step === n && (
              <motion.div className="absolute w-5 h-5 rounded-full border-2 border-[#4F46E5]"
                animate={{ opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} />
            )}
          </div>
          {n < 3 && <div className="w-8 h-px transition-all duration-500" style={{ backgroundColor: step > n ? '#10B981' : '#E5E7EB' }} />}
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
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="relative">
        <input id={id} type={type} placeholder={placeholder}
          className={`${inputCls(!!error)} ${children ? 'pr-11' : ''}`}
          aria-invalid={!!error} {...registration} />
        {children}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-xs mt-1" role="alert">{error}</motion.p>
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
      className={`cursor-pointer rounded-2xl p-6 border-2 flex flex-col items-center gap-4 text-center select-none transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
      role="radio" aria-checked={selected} tabIndex={0}
    >
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-3xl shadow-md`}>{card.icon}</div>
      <div>
        <h3 className="text-gray-900 font-bold text-lg">{card.title}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{card.desc}</p>
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

  const [step, setStep] = useState<1 | 2 | 3>(initialRole ? 2 : 1)
  const [direction, setDir] = useState<Direction>(1)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [showTerms, setShowTerms] = useState(false)

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
    // İstifadə şərtləri qəbul edilməyibsə — backend-ə getmirik (dürüst frontend bloku).
    if (!termsAccepted) {
      setTermsError('Davam etmək üçün istifadə şərtlərini qəbul edin.')
      return
    }
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
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
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
        <div className="w-full max-w-lg">
          {/* Brand (mobile) + step title */}
          <div className="mb-6">
            <Link
              to={APP_ROUTES.HOME}
              className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
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
            <p className="text-center text-sm font-medium text-gray-500">{stepTitles[step]}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <RegProgressBar step={step} />

            {step > 1 && (
              <button onClick={() => go(step === 3 ? 2 : 1, -1)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors text-sm mb-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Geri qayıt">
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
                        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Sən <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">kimsən?</span></h2>
                        <p className="text-gray-500 mt-2 text-sm">Rolunu seç — davam et</p>
                      </div>
                      <motion.div variants={stagger} initial="hidden" animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full" style={{ perspective: 1000 }}>
                        {ROLE_CARDS.map((card) => (
                          <Step1RoleCard key={card.role} card={card} selected={role === card.role} onSelect={() => handleRoleSelect(card.role)} />
                        ))}
                      </motion.div>
                      <p className="text-center text-sm text-gray-500 mt-2">
                        Artıq hesabın var?{' '}
                        <Link to={APP_ROUTES.LOGIN} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Daxil ol</Link>
                      </p>
                    </div>
                  )}

                  {/* STEP 2 — sahələr */}
                  {step === 2 && role && roleCard && (
                    <div className="flex flex-col gap-5 w-full">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient} flex items-center justify-center text-xl shrink-0`}>{roleCard.icon}</div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Məlumatlarını daxil et</h2>
                          <p className="text-gray-500 text-xs">{roleCard.title} kimi qeydiyyat</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field id="name" label="Ad" placeholder="Adın" error={errors.name?.message} registration={register('name')} />
                        <Field id="surname" label="Soyad" placeholder="Soyadın" error={errors.surname?.message} registration={register('surname')} />
                      </div>

                      <Field id="email" label="Email" type="email" placeholder="məsələn: ad@mail.com" error={errors.email?.message} registration={sanitize(register('email'), true)} />
                      <Field id="phone" label="Telefon" type="tel" placeholder="+994 50 000 00 00" error={errors.phone?.message} registration={register('phone')} />

                      <Field id="password" label="Şifrə" type={showPass ? 'text' : 'password'} placeholder="Minimum 6 simvol" error={errors.password?.message} registration={sanitize(register('password'))}>
                        <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Göstər/gizlət">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </Field>

                      <Field id="confirmPass" label="Şifrəni təkrar et" type={showConfirm ? 'text' : 'password'} placeholder="Şifrəni təkrar yaz" error={errors.confirmPassword?.message} registration={sanitize(register('confirmPassword'))}>
                        <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Göstər/gizlət">
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </Field>

                      {/* Tələbə → yaş qrupu */}
                      {role === 'student' && (
                        <div>
                          <label htmlFor="ageGroup" className={labelCls}>Yaş qrupu</label>
                          <select id="ageGroup" className={inputCls(!!errors.ageGroup)} {...register('ageGroup')}>
                            <option value="">Yaş qrupunu seç...</option>
                            {AGE_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {errors.ageGroup && <p className="text-red-500 text-xs mt-1" role="alert">{errors.ageGroup.message}</p>}
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
                        className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-1 bg-indigo-600 hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                        Davam et →
                      </motion.button>
                    </div>
                  )}

                  {/* STEP 3 — təsdiq */}
                  {step === 3 && role && roleCard && (
                    <div className="flex flex-col gap-6 w-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Məlumatlarını <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">təsdiqlə</span></h2>
                        <p className="text-gray-500 text-sm mt-1">Hər şey düzdürsə, başla!</p>
                      </div>
                      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleCard.gradient} flex items-center justify-center text-xl`}>{roleCard.icon}</div>
                          <span className="text-gray-900 font-bold">{ROLE_LABELS[role]}</span>
                        </div>
                        {[
                          { label: 'Ad Soyad', value: `${values.name} ${values.surname}` },
                          { label: 'Email', value: values.email },
                          { label: 'Telefon', value: values.phone },
                          ...(role === 'student' ? [{ label: 'Yaş qrupu', value: AGE_GROUP_OPTIONS.find((o) => o.value === values.ageGroup)?.label ?? '—' }] : []),
                          ...(role === 'teacher' ? [{ label: 'İxtisas', value: values.specialty || '—' }] : []),
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between items-center gap-3">
                            <span className="text-gray-500 text-sm shrink-0">{row.label}</span>
                            <span className="text-gray-900 text-sm font-medium text-right truncate">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      {/* İstifadə şərtləri razılığı — qeydiyyatdan əvvəl mütləqdir */}
                      <div>
                        <div className="flex items-start gap-3">
                          <button type="button" role="checkbox" aria-checked={termsAccepted} aria-label="İstifadə şərtlərini qəbul et"
                            onClick={() => { setTermsAccepted((v) => !v); if (termsError) setTermsError('') }}
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${termsAccepted ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white hover:border-indigo-400'}`}>
                            {termsAccepted && <Check size={12} />}
                          </button>
                          <p className="text-sm leading-relaxed text-gray-600">
                            <button type="button" onClick={() => setShowTerms(true)}
                              className="rounded font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">İstifadə şərtləri</button>
                            {' '}və{' '}
                            <button type="button" onClick={() => setShowTerms(true)}
                              className="rounded font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">məxfilik qaydaları</button>
                            {' '}ilə razıyam.
                          </p>
                        </div>
                        {termsError && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-xs mt-1.5" role="alert">{termsError}</motion.p>
                        )}
                      </div>

                      <motion.button
                        onClick={() => {
                          if (!termsAccepted) { setTermsError('Davam etmək üçün istifadə şərtlərini qəbul edin.'); return }
                          setTermsError('')
                          handleSubmit(onSubmit)()
                        }}
                        disabled={isSubmitting}
                        whileHover={!isSubmitting ? { scale: 1.015 } : {}} whileTap={!isSubmitting ? { scale: 0.985 } : {}}
                        className="w-full py-3.5 rounded-xl font-semibold text-white text-base bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                        {isSubmitting ? 'Qeydiyyat...' : 'Qeydiyyatı tamamla'}
                      </motion.button>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* İstifadə şərtləri modalı */}
      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      </AnimatePresence>
    </div>
  )
}
