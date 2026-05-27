import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  motion,
  useTransform,
  useInView,
  useScroll,
  AnimatePresence,
  type Variants,
} from 'framer-motion'
import { APP_ROUTES } from '../constants'
import { LogiCoraHero } from '../components/hero/LogiCoraHero'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface NavLink {
  label: string
  href: string
}

interface StatItem {
  value: string
  numericTarget: number
  suffix: string
  label: string
  color: string
}

interface QuizAnswer {
  key: string
  text: string
}

// ── Static data ───────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { label: 'Ana səhifə', href: '#' },
  { label: 'Haqqında',   href: '#features' },
  { label: 'Kurslar',    href: '#courses'  },
  { label: 'Qiymət',     href: '#pricing'  },
]

const QUIZ_ANSWERS: QuizAnswer[] = [
  { key: 'A', text: '2, 4, 8, 16...' },
  { key: 'B', text: '1, 3, 6, 10...' },
  { key: 'C', text: '5, 10, 20, 35...' },
]

const STATS: StatItem[] = [
  { value: '1 000+',  numericTarget: 1000,  suffix: '+', label: 'Aktiv tələbə',     color: 'text-[#0D9488]'  },
  { value: '50+',     numericTarget: 50,    suffix: '+', label: 'Fənn & kurs',      color: 'text-purple-400' },
  { value: '10 000+', numericTarget: 10000, suffix: '+', label: 'Cavablanmış sual', color: 'text-cyan-400'   },
  { value: '25+',     numericTarget: 25,    suffix: '+', label: 'Oyun-əsaslı alət', color: 'text-orange-400' },
]

// ── Guide accent helpers ──────────────────────────────────────────────────────

type Guide = 'logi' | 'cora' | null

function guideAccent(guide: Guide): { text: string; border: string; bg: string; hex: string } {
  if (guide === 'logi') return {
    text:   'text-[#3B82F6]',
    border: 'border-[#3B82F6]/20',
    bg:     'bg-[#3B82F6]/10',
    hex:    '#3B82F6',
  }
  if (guide === 'cora') return {
    text:   'text-[#9333EA]',
    border: 'border-[#9333EA]/20',
    bg:     'bg-[#9333EA]/10',
    hex:    '#9333EA',
  }
  return {
    text:   'text-[#0D9488]',
    border: 'border-[#0D9488]/20',
    bg:     'bg-[#0D9488]/10',
    hex:    '#0D9488',
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CountUp({ target, suffix, color }: { target: number; suffix: string; color: string }) {
  const ref     = useRef<HTMLSpanElement>(null)
  const inView  = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let v = 0
    const inc = target / 60
    const iv = setInterval(() => {
      v += inc
      if (v >= target) { setCount(target); clearInterval(iv) }
      else setCount(Math.floor(v))
    }, 2000 / 60)
    return () => clearInterval(iv)
  }, [inView, target])

  return (
    <span ref={ref} className={`text-5xl font-bold ${color}`}>
      {target >= 1000 ? count.toLocaleString('az-AZ') : count}{suffix}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const [searchParams]  = useSearchParams()
  const { scrollY }     = useScroll()
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const guide  = searchParams.get('guide') as Guide
  const accent = guideAccent(guide)

  const navBg = useTransform(scrollY, [0, 100], ['rgba(13,13,13,0)', 'rgba(13,13,13,0.95)'])

  const sectionVariants: Variants = {
    hidden:  { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <LogiCoraHero />

      {/* ── FIXED NAVBAR (görünür scroll-dan sonra) ─────────────────────────── */}
      <motion.nav
        style={{ backgroundColor: navBg }}
        className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06] backdrop-blur-xl pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8 pointer-events-auto">
          <span className="font-bold text-white text-xl select-none">🤖✨ LogiCora</span>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href}
                className={`text-white/50 hover:${accent.text} transition-colors duration-200 text-sm`}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate(APP_ROUTES.LOGIN)}
              className="border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-full px-5 py-2 text-sm transition-all duration-200">
              Daxil ol
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(APP_ROUTES.REGISTER)}
              className="text-white rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200"
              style={{ backgroundColor: accent.hex }}
            >
              Başla →
            </motion.button>
          </div>

          <button className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(true)} aria-label="Menyu aç">
            <span className="w-6 h-px bg-white/60" />
            <span className="w-6 h-px bg-white/60" />
            <span className="w-4 h-px bg-white/60" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#0D0D0D] flex flex-col items-center justify-center gap-8">
            <button className="absolute top-5 right-6 text-white/50 hover:text-white text-2xl"
              onClick={() => setMobileOpen(false)}>✕</button>
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                className={`text-white/60 hover:${accent.text} text-2xl font-semibold transition-colors`}>
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 mt-4 w-48">
              <button onClick={() => { navigate(APP_ROUTES.LOGIN); setMobileOpen(false) }}
                className="border border-white/20 text-white/70 rounded-full px-5 py-3 text-base">
                Daxil ol
              </button>
              <button onClick={() => { navigate(APP_ROUTES.REGISTER); setMobileOpen(false) }}
                className="text-white rounded-full px-5 py-3 text-base font-semibold"
                style={{ backgroundColor: accent.hex }}>
                Başla →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION 1 — Günlük öyrənmə ─────────────────────────────────────── */}
      <motion.section
        id="features"
        variants={sectionVariants} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="min-h-screen flex items-center py-20 px-4 sm:px-8 lg:px-16"
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <div className="relative">
            <p className={`${accent.text} text-xs tracking-widest font-semibold uppercase mb-6`}>
              Günlük öyrənmə
            </p>
            <div className="space-y-1">
              {[
                { text: 'Hər gün',          cls: 'text-white/30' },
                { text: '5 sual.',          cls: 'text-white/60' },
                { text: 'Streak qır,',      cls: 'text-white/80' },
                { text: 'dünya sarsılsın.', cls: accent.text     },
              ].map((line, i) => (
                <motion.p key={line.text}
                  initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${line.cls}`}>
                  {line.text}
                </motion.p>
              ))}
            </div>
            <p className="text-white/35 text-base leading-relaxed mt-6 max-w-sm">
              Yaşına, fənninə, hobbinə uyğun suallar.<br />
              Logi sual verir, Cora hərf verir — sən cavablayırsan.
            </p>
            <div className="absolute -left-6 top-0 bottom-0 hidden lg:flex flex-col items-center gap-5 pt-4">
              <div className="w-px flex-1" style={{ background: `linear-gradient(to bottom, ${accent.hex}50, transparent)` }} />
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accent.hex }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }} />
              ))}
            </div>
          </div>

          <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3 }}
            className={`bg-[#0a1628] border ${accent.border} rounded-2xl p-6 max-w-sm mx-auto w-full`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/80 font-semibold">Günün sualı 🧠</p>
              <span className="bg-orange-400/10 border border-orange-400/20 text-orange-400 text-xs rounded-full px-2 py-0.5">
                🔥 23 gün
              </span>
            </div>
            <p className="text-white/60 text-sm mb-4 leading-relaxed">
              Hansı riyazi ardıcıllıq düzgündür?
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {QUIZ_ANSWERS.map((a) => (
                <motion.button key={a.key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedAnswer(a.key)}
                  className={`text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    selectedAnswer === a.key
                      ? `${accent.bg} ${accent.border} ${accent.text}`
                      : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:border-white/20'
                  }`}>
                  {a.key}. {a.text}
                </motion.button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <motion.circle cx="20" cy="20" r="16" fill="none"
                    stroke={accent.hex} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="100.5"
                    initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 100.5 }}
                    transition={{ duration: 30, ease: 'linear', repeat: Infinity }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs font-mono">30</span>
              </div>
              <p className="text-white/30 text-xs leading-relaxed">
                Logi: Bu sualı 847 tələbə cavabladı 🤔
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── SECTION 2 — Canlı yarışlar ─────────────────────────────────────── */}
      <motion.section
        variants={sectionVariants} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="min-h-screen flex items-center py-20 px-4 sm:px-8 lg:px-16"
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3 }}
            className="bg-[#0a1628] border border-cyan-400/20 rounded-2xl p-6 max-w-sm mx-auto w-full order-2 lg:order-1">
            <p className="text-5xl font-mono text-cyan-400 font-bold tracking-widest mb-2"
              style={{ textShadow: '0 0 30px rgba(34,211,238,0.4)' }}>4829</p>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-white/40 text-sm">12 iştirakçı</span>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }} />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {['🦁', '🐯', '🦊', '🐺', '🦅', '🐉', '🦋', '🐬'].map((e, i) => (
                <motion.div key={i}
                  initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-lg">
                  {e}
                </motion.div>
              ))}
            </div>
            <p className="text-white/30 text-sm">Logi: Hazır olun! 3... 2... 1... 🚀</p>
          </motion.div>

          <div className="order-1 lg:order-2">
            <p className="text-cyan-400 text-xs tracking-widest font-semibold uppercase mb-6">
              Real-time yarışlar
            </p>
            <div className="space-y-1">
              {[
                { text: 'PIN yaz.',      cls: 'text-white/30'  },
                { text: '30 saniyədə',   cls: 'text-cyan-400'  },
                { text: 'yarışa başla.', cls: 'text-white/80'  },
              ].map((line, i) => (
                <motion.p key={line.text}
                  initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${line.cls}`}>
                  {line.text}
                </motion.p>
              ))}
            </div>
            <p className="text-white/35 text-base leading-relaxed mt-6 max-w-sm">
              Kahoot kimi — amma avatarın,<br />Elo reytinqin, klan şərəfin var.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 3 — Portfolio ───────────────────────────────────────────── */}
      <motion.section
        variants={sectionVariants} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="min-h-screen flex items-center py-20 px-4 sm:px-8 lg:px-16"
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <div>
            <p className="text-purple-400 text-xs tracking-widest font-semibold uppercase mb-6">
              Rəqəmsal portfolio
            </p>
            <div className="space-y-1">
              {[
                { text: 'Hər addımın', cls: 'text-white/30'   },
                { text: 'izi —',       cls: 'text-purple-400' },
                { text: '3 yaşdan',    cls: 'text-white/60'   },
                { text: 'karyeraya.',  cls: 'text-white/90'   },
              ].map((line, i) => (
                <motion.p key={line.text}
                  initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight ${line.cls}`}>
                  {line.text}
                </motion.p>
              ))}
            </div>
            <p className="text-white/35 text-base leading-relaxed mt-6 max-w-sm">
              Hər kurs, hər yarış, hər badge — portfolionda.<br />
              İşəgötürən görür, universitet seçir,<br />
              heç kim sənin biliyini inkar edə bilməz.
            </p>
          </div>

          <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.3 }}
            className="bg-[#0a1628] border border-purple-400/20 rounded-2xl p-6 max-w-sm mx-auto w-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-2xl">👤</div>
              <div>
                <p className="text-white/80 font-semibold">Əli Həsənov</p>
                <p className="text-white/40 text-sm">Level 8 · Diamond 💎</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { label: 'Riyaziyyat', pct: 87, color: 'bg-purple-400' },
                { label: 'Məntiq',     pct: 92, color: 'bg-[#0D9488]'  },
              ].map((skill) => (
                <div key={skill.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/50">{skill.label}</span>
                    <span className="text-white/40">{skill.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05]">
                    <motion.div initial={{ width: '0%' }}
                      whileInView={{ width: `${skill.pct}%` }} viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                      className={`h-full rounded-full ${skill.color}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {['🏆','⭐','🎯','🔥','💎','🎖️','🧠','🚀','✨','👑','🌟','🎪'].map((badge, i) => (
                <motion.span key={i} initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: i * 0.05 }} className="text-lg">
                  {badge}
                </motion.span>
              ))}
            </div>
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
              <span className="text-white/30 text-xs font-mono">logicora.az/p/ali</span>
              <span className="text-[#0D9488] text-xs font-semibold">✓ Verified</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-8 text-center">
        <p className="text-white/20 text-sm tracking-widest uppercase mb-4">Rəqəmlərlə LogiCora</p>
        <div className="w-16 h-px bg-white/10 mx-auto mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {STATS.map((stat) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="flex flex-col items-center">
              <CountUp target={stat.numericTarget} suffix={stat.suffix} color={stat.color} />
              <p className="text-white/40 text-sm mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${accent.hex}10 0%, transparent 70%)` }} />
        <motion.span animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-6">
          {guide === 'logi' ? '🤖' : guide === 'cora' ? '🪄' : '🤖'}
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.8 }}
          className="text-4xl sm:text-5xl md:text-7xl font-bold text-center leading-tight tracking-tight">
          Gələcəyini{' '}
          <span style={{ color: accent.hex }}>bu gün</span>
          {' '}qur.
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white/30 mt-4 text-lg text-center">
          Minlərlə Azərbaycan tələbəsi artıq öyrənir.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate(APP_ROUTES.REGISTER)}
          className="mt-10 text-white rounded-full px-10 py-4 font-semibold text-lg transition-colors duration-200"
          style={{ backgroundColor: accent.hex }}>
          Pulsuz qeydiyyat →
        </motion.button>
        <motion.span animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="text-6xl mt-6">✨</motion.span>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <p className="text-white/25 text-sm">
            © 2026 LogiCora — Azərbaycan Milli Təhsil Platforması
          </p>
          <div className="flex gap-6">
            {['Məxfilik', 'Şərtlər'].map((item) => (
              <a key={item} href="#"
                className="text-white/25 text-sm hover:text-white/50 transition-colors duration-200">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
