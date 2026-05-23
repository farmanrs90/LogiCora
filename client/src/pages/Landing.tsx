import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { APP_ROUTES } from '../constants'

// ── Types ─────────────────────────────────────────────────────────────────

interface ParticleConfig {
  id: number
  size: number
  top: string
  left: string
  color: string
  duration: number
  delay: number
  yRange: number[]
  xRange: number[]
}

interface RoleCardData {
  title: string
  subtitle: string
  icon: string
  gradient: string
  glowColor: string
  role: 'student' | 'teacher' | 'parent'
}

interface FeatureData {
  icon: string
  title: string
  description: string
}

interface StepData {
  number: string
  title: string
  description: string
  color: string
}

interface StatData {
  value: string
  label: string
  gradientClass: string
}

// ── Static data ───────────────────────────────────────────────────────────

const PARTICLES: ParticleConfig[] = [
  { id: 0, size: 380, top: '2%',  left: '-8%', color: '#3B82F6', duration: 9,  delay: 0,   yRange: [0, -30, 0], xRange: [0,  15, 0] },
  { id: 1, size: 280, top: '65%', left: '82%', color: '#9333EA', duration: 11, delay: 2,   yRange: [0,  25, 0], xRange: [0, -12, 0] },
  { id: 2, size: 200, top: '38%', left: '72%', color: '#06B6D4', duration: 7,  delay: 0.5, yRange: [0, -20, 0], xRange: [0,  20, 0] },
  { id: 3, size: 140, top: '18%', left: '58%', color: '#EC4899', duration: 13, delay: 1,   yRange: [0,  15, 0], xRange: [0, -15, 0] },
  { id: 4, size: 220, top: '78%', left: '8%',  color: '#58CC02', duration: 10, delay: 3,   yRange: [0, -25, 0], xRange: [0,  10, 0] },
  { id: 5, size: 160, top: '48%', left: '28%', color: '#F97316', duration: 8,  delay: 1.5, yRange: [0,  20, 0], xRange: [0, -20, 0] },
]

const ROLE_CARDS: RoleCardData[] = [
  {
    title: 'Tələbə',
    subtitle: 'Öyrən, yarış, böyü',
    icon: '🎮',
    gradient: 'from-[#3B82F6] to-[#9333EA]',
    glowColor: 'rgba(59,130,246,0.25)',
    role: 'student',
  },
  {
    title: 'Müəllim',
    subtitle: 'İdarə et, inkişaf et',
    icon: '🎓',
    gradient: 'from-[#059669] to-[#0D9488]',
    glowColor: 'rgba(5,150,105,0.25)',
    role: 'teacher',
  },
  {
    title: 'Valideyn',
    subtitle: 'İzlə, dəstəklə',
    icon: '❤️',
    gradient: 'from-[#F97316] to-[#EF4444]',
    glowColor: 'rgba(249,115,22,0.25)',
    role: 'parent',
  },
]

const FEATURES: FeatureData[] = [
  {
    icon: '⚡',
    title: 'Oyunlaşdırılmış öyrənmə',
    description: 'XP, zolaqlar, liqalar, nişanlar — hər addım səni irəli aparır.',
  },
  {
    icon: '🏆',
    title: 'Real-time yarışlar',
    description: 'PIN ilə qoşul, digər tələbələrlə canlı yarış, gözlərini istirahət etdir.',
  },
  {
    icon: '📊',
    title: 'Ağıllı analitika',
    description: 'Valideyn və müəllim üçün dərin tərəqqi hesabatları, avtomatik uyğunlaşma.',
  },
]

const STEPS: StepData[] = [
  { number: '01', title: 'Qeydiyyat', description: 'Rolunu seç, profilini qur', color: '#3B82F6' },
  { number: '02', title: 'Öyrən',     description: 'Günlük quiz, kurslar, dərslər', color: '#9333EA' },
  { number: '03', title: 'Yarış',     description: 'Klan döyüşləri, Həftənin Sirri', color: '#58CC02' },
  { number: '04', title: 'Böyü',      description: 'Portfolio, sertifikat, gələcək', color: '#F97316' },
]

const STATS: StatData[] = [
  { value: '1 000+',  label: 'Aktiv tələbə',  gradientClass: 'from-[#3B82F6] to-[#06B6D4]' },
  { value: '50+',     label: 'Müəllim',        gradientClass: 'from-[#9333EA] to-[#EC4899]' },
  { value: '10 000+', label: 'Sual bazası',    gradientClass: 'from-[#58CC02] to-[#06B6D4]' },
  { value: '25+',     label: 'Fənn',           gradientClass: 'from-[#F97316] to-[#EF4444]' },
]

// ── Animation variants ────────────────────────────────────────────────────

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.14 } },
}

const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } },
}

const fadeIn = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

// ── Sub-components ────────────────────────────────────────────────────────

function FloatingParticle({ p }: { p: ParticleConfig }) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl pointer-events-none"
      style={{
        width:           p.size,
        height:          p.size,
        top:             p.top,
        left:            p.left,
        backgroundColor: p.color,
        opacity:         0.13,
      }}
      animate={{ y: p.yRange, x: p.xRange }}
      transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function RoleCard({ title, subtitle, icon, gradient, glowColor, role }: RoleCardData) {
  const ref       = useRef<HTMLDivElement>(null)
  const navigate  = useNavigate()
  const mouseX    = useMotionValue(0)
  const mouseY    = useMotionValue(0)
  const rotateX   = useTransform(mouseY, [-0.5, 0.5], [9, -9])
  const rotateY   = useTransform(mouseX, [-0.5, 0.5], [-9, 9])

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width  - 0.5)
    mouseY.set((e.clientY - rect.top)  / rect.height - 0.5)
  }

  function onLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  function go() {
    navigate(`${APP_ROUTES.REGISTER}?role=${role}`)
  }

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={go}
      onKeyDown={(e) => e.key === 'Enter' && go()}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', boxShadow: `0 0 0 0 ${glowColor}` }}
      whileHover={{ scale: 1.06, boxShadow: `0 20px 60px ${glowColor}` }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative cursor-pointer rounded-2xl p-8 border border-[rgba(255,255,255,0.1)]
                 bg-[rgba(255,255,255,0.05)] backdrop-blur-md
                 flex flex-col items-center gap-5 text-center select-none
                 transition-border duration-300 outline-none"
      aria-label={`${title} kimi qeydiyyat`}
      role="button"
      tabIndex={0}
    >
      {/* Icon badge */}
      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient}
                       flex items-center justify-center text-4xl shadow-lg`}>
        {icon}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="text-[#9CA3AF] text-sm mt-1">{subtitle}</p>
      </div>

      {/* Bottom accent line */}
      <div className={`w-full h-px bg-gradient-to-r ${gradient} opacity-40 rounded-full`} />

      <span className={`text-sm font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        Başla →
      </span>
    </motion.div>
  )
}

function FeatureCard({ icon, title, description }: FeatureData) {
  return (
    <motion.div
      variants={fadeUp}
      className="card flex flex-col gap-4 group
                 hover:border-[rgba(147,51,234,0.35)] transition-colors duration-300"
    >
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-[#9CA3AF] text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}

function StepCard({ number, title, description, color }: StepData) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center text-center gap-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center
                   text-xl font-black border-2 shrink-0"
        style={{ borderColor: color, color, backgroundColor: `${color}18` }}
      >
        {number}
      </div>
      <h3 className="text-white font-bold text-lg">{title}</h3>
      <p className="text-[#9CA3AF] text-sm">{description}</p>
    </motion.div>
  )
}

function SectionHeading({
  text,
  highlight,
  gradientClass,
  subtitle,
}: {
  text: string
  highlight: string
  gradientClass: string
  subtitle?: string
}) {
  return (
    <motion.div variants={fadeIn} className="text-center mb-16">
      <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
        {text}{' '}
        <span className={`bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
          {highlight}
        </span>
      </h2>
      {subtitle && (
        <p className="text-[#9CA3AF] mt-4 text-lg max-w-lg mx-auto">{subtitle}</p>
      )}
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-[#0D0D0D] overflow-x-hidden">

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pb-12 overflow-hidden">

        {/* Ambient background particles */}
        {PARTICLES.map((p) => <FloatingParticle key={p.id} p={p} />)}

        {/* Hero content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex flex-col items-center gap-6 max-w-4xl w-full text-center"
        >
          {/* Mascot row */}
          <motion.div variants={fadeUp} className="flex items-end gap-10 mb-2">
            <motion.div
              className="flex flex-col items-center gap-1"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-6xl sm:text-7xl" role="img" aria-label="Logi">🤖</span>
              <span className="text-xs text-[#3B82F6] font-bold tracking-widest uppercase">Logi</span>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-1"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            >
              <span className="text-6xl sm:text-7xl" role="img" aria-label="Cora">🧙‍♀️</span>
              <span className="text-xs text-[#9333EA] font-bold tracking-widest uppercase">Cora</span>
            </motion.div>
          </motion.div>

          {/* Main logo */}
          <motion.h1
            variants={fadeUp}
            className="text-7xl sm:text-9xl font-black tracking-tight leading-none
                       bg-gradient-to-r from-[#3B82F6] via-[#9333EA] to-[#06B6D4]
                       bg-clip-text text-transparent"
          >
            LogiCora
          </motion.h1>

          {/* Tagline */}
          <motion.p variants={fadeUp} className="text-xl sm:text-2xl text-[#9CA3AF] font-medium">
            Bilikdə güc, gələcəkdə iz.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mt-2">
            <button
              onClick={() => navigate(APP_ROUTES.REGISTER)}
              className="btn-primary px-8 py-3 text-base rounded-xl"
            >
              🚀 Pulsuz başla
            </button>
            <button
              onClick={() => navigate(APP_ROUTES.LOGIN)}
              className="btn-outline px-8 py-3 text-base rounded-xl"
            >
              Daxil ol
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            variants={fadeUp}
            className="mt-6 flex flex-col items-center gap-2 text-[#9CA3AF] text-xs"
          >
            <span>Rol seç</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-5 h-8 rounded-full border border-[rgba(255,255,255,0.2)] flex items-start justify-center pt-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Role cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full mt-14"
          style={{ perspective: 1200 }}
        >
          {ROLE_CARDS.map((card) => <RoleCard key={card.role} {...card} />)}
        </motion.div>
      </section>

      {/* ════════════ BÖLMƏ 1 — Niyə LogiCora? ════════════ */}
      <section className="py-28 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="max-w-5xl mx-auto"
        >
          <SectionHeading
            text="Niyə"
            highlight="LogiCora?"
            gradientClass="from-[#9333EA] to-[#06B6D4]"
            subtitle="Adi öyrənmə yox — hər tələbənin öz səyahəti."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </motion.div>
      </section>

      {/* ════════════ BÖLMƏ 2 — Necə işləyir? ════════════ */}
      <section className="py-28 px-6 bg-[#111827]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="max-w-5xl mx-auto"
        >
          <SectionHeading
            text="Necə"
            highlight="işləyir?"
            gradientClass="from-[#3B82F6] to-[#06B6D4]"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 relative">
            {/* Connecting gradient line — desktop only */}
            <div
              className="absolute top-8 left-[12.5%] right-[12.5%] h-px
                         bg-gradient-to-r from-[#3B82F6] via-[#9333EA] via-[#58CC02] to-[#F97316]
                         opacity-25 hidden sm:block pointer-events-none"
            />
            {STEPS.map((s) => <StepCard key={s.number} {...s} />)}
          </div>
        </motion.div>
      </section>

      {/* ════════════ BÖLMƏ 3 — Statistika ════════════ */}
      <section className="py-28 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={stagger}
          className="max-w-4xl mx-auto"
        >
          <SectionHeading
            text="Rəqəmlərlə"
            highlight="LogiCora"
            gradientClass="from-[#58CC02] to-[#06B6D4]"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="card text-center hover:border-[rgba(88,204,2,0.3)] transition-colors duration-300"
              >
                <p className={`text-3xl sm:text-4xl font-black bg-gradient-to-r ${stat.gradientClass} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className="text-[#9CA3AF] text-sm mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════════ BÖLMƏ 4 — CTA ════════════ */}
      <section className="py-36 px-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#9333EA]/8 via-transparent to-[#3B82F6]/8 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#9333EA] opacity-[0.07] blur-3xl pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={stagger}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <motion.h2 variants={fadeIn} className="text-4xl sm:text-6xl font-black text-white leading-tight">
            Gələcəyini{' '}
            <span className="bg-gradient-to-r from-[#3B82F6] via-[#9333EA] to-[#06B6D4] bg-clip-text text-transparent">
              bu gün
            </span>{' '}
            qur.
          </motion.h2>

          <motion.p variants={fadeIn} className="text-[#9CA3AF] text-lg mt-6 mb-10 leading-relaxed">
            Minlərlə Azərbaycan tələbəsi artıq LogiCora ilə öyrənir.
            <br />
            Sıra sənindədir.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(APP_ROUTES.REGISTER)}
              className="btn-primary px-10 py-4 text-lg font-bold rounded-xl"
            >
              🚀 Pulsuz qeydiyyat
            </button>
            <button
              onClick={() => navigate(APP_ROUTES.LOGIN)}
              className="btn-outline px-10 py-4 text-lg rounded-xl"
            >
              Daxil ol
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-[rgba(255,255,255,0.08)] py-8 px-6 text-center">
        <p className="text-[#9CA3AF] text-sm">
          © 2026 LogiCora — Azərbaycan Milli Təhsil Platforması
        </p>
      </footer>
    </main>
  )
}
