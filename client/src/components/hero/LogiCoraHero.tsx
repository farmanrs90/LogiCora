import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { APP_ROUTES } from '../../constants'
import { setCompanion,type Companion } from '../../lib/companion'


type SelectedGuide = 'logi' | 'cora' | null

export function LogiCoraHero({onSelect}: {onSelect: (companion: Companion) => void}) {
  const navigate = useNavigate()
  const [selected, setSelected]       = useState<SelectedGuide>(null)
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null)

  const handleSelect = (guide: SelectedGuide) => {
  if (!guide) return
  setSelected(guide)
  setCompanion(guide)        // ← seçimi cihaza yaz; F5-dən sonra da qalır
  setTimeout(() => {
        onSelect(guide)        // register YOX — Landing-ə bildir, o turu başlatsın

  }, 2000)
}
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor:
          selected === 'logi'
            ? '#080d1a'
            : selected === 'cora'
              ? '#0d0814'
              : '#0D0D0D',
        transition: 'background-color 0.5s ease',
      }}
    >
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
        <span className="text-lg font-bold text-white">LogiCora</span>
        <button
          onClick={() => navigate(APP_ROUTES.LOGIN)}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          Daxil ol
        </button>
      </nav>

      {/* Selected state overlay */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Guide emoji in corner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`fixed top-20 z-40 ${selected === 'logi' ? 'left-6' : 'right-6'}`}
            >
              <motion.span
                className="text-4xl"
                animate={
                  selected === 'logi'
                    ? { y: [0, -5, 0] }
                    : { rotate: [0, 10, -10, 0] }
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                {selected === 'logi' ? '🤖' : '🪄'}
              </motion.span>
            </motion.div>

            {/* Welcome message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute inset-0 z-30 flex items-center justify-center"
            >
              <div className="text-center px-6">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-3xl font-bold md:text-5xl ${
                    selected === 'logi' ? 'text-[#3B82F6]' : 'text-[#9333EA]'
                  }`}
                >
                  {selected === 'logi'
                    ? 'Salam! Mən Logi-yəm. 🤖'
                    : 'Salam! Mən Cora-yam. 🪄'}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className={`mt-4 text-xl md:text-2xl ${
                    selected === 'logi' ? 'text-[#3B82F6]/70' : 'text-[#9333EA]/70'
                  }`}
                >
                  {selected === 'logi'
                    ? 'Gəl sənə LogiCora-nı göstərim!'
                    : 'Gəl birlikdə gəzək!'}
                </motion.p>
              </div>
            </motion.div>

            {/* Particle explosion */}
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute h-1 w-1 rounded-full ${
                    selected === 'logi' ? 'bg-[#3B82F6]' : 'bg-[#9333EA]'
                  }`}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: 0,
                  }}
                  animate={{
                    y: [null, Math.random() * window.innerHeight],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main split view */}
      <AnimatePresence>
        {!selected && (
          <motion.div
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col md:flex-row"
          >
            {/* ── LEFT — LOGİ ── */}
            <motion.div
              className="relative flex min-h-[45vh] cursor-pointer items-center justify-center overflow-hidden md:min-h-screen"
              style={{ backgroundColor: '#080d1a' }}
              animate={{
                flex:
                  hoveredSide === 'left'
                    ? '0 0 55%'
                    : hoveredSide === 'right'
                      ? '0 0 45%'
                      : '0 0 50%',
              }}
              transition={{ duration: 0.3 }}
              onMouseEnter={() => setHoveredSide('left')}
              onMouseLeave={() => setHoveredSide(null)}
              onClick={() => handleSelect('logi')}
            >
              {/* Blue glow */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
                  opacity: hoveredSide === 'left' ? 1.5 : 1,
                }}
              />

              {/* Blue particles */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-[#3B82F6]/40"
                    animate={{
                      y: ['100%', '-100%'],
                      x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 5 + Math.random() * 5,
                      repeat: Infinity,
                      delay: Math.random() * 5,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <motion.span
                  className="text-8xl md:text-9xl"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.15 }}
                >
                  🤖
                </motion.span>
                <h2 className="mt-6 text-3xl font-black tracking-[0.3em] text-[#3B82F6]">
                  LOGİ
                </h2>
                <p className="mt-2 text-sm text-white/30">Sənin köməkçin</p>
              </div>

              {/* Right border glow */}
              <motion.div
                className="absolute right-0 top-0 bottom-0 w-1 hidden md:block"
                animate={{
                  boxShadow:
                    hoveredSide === 'left'
                      ? '0 0 20px 5px rgba(59,130,246,0.5)'
                      : 'none',
                  backgroundColor:
                    hoveredSide === 'left'
                      ? 'rgba(59,130,246,0.5)'
                      : 'transparent',
                }}
              />
            </motion.div>

            {/* ── CENTER LIGHTNING — Desktop ── */}
            <div className="absolute left-1/2 top-0 bottom-0 z-20 hidden -translate-x-1/2 items-center justify-center md:flex">
              <motion.svg
                width="20"
                height="100%"
                viewBox="0 0 20 400"
                className="h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="lch-lightning" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#9333EA" />
                  </linearGradient>
                  <filter id="lch-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <motion.path
                  d="M10 0 L12 80 L8 85 L14 160 L6 165 L12 240 L8 245 L14 320 L10 400"
                  stroke="url(#lch-lightning)"
                  strokeWidth="2"
                  fill="none"
                  filter="url(#lch-glow)"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.svg>

              {/* LogiCora badge */}
              <div
                className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#0D0D0D] px-5 py-2 text-sm font-bold text-white"
                style={{ boxShadow: '0 0 30px rgba(147,51,234,0.3), 0 0 60px rgba(59,130,246,0.15)' }}
              >
                🤖 LogiCora 🪄
              </div>
            </div>

            {/* ── CENTER LIGHTNING — Mobile ── */}
            <div className="relative z-20 flex h-[2px] w-full items-center justify-center md:hidden">
              <motion.svg
                width="100%"
                height="20"
                viewBox="0 0 400 20"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="lch-lightning-h" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#9333EA" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0 10 L80 12 L85 8 L160 14 L165 6 L240 12 L245 8 L320 14 L400 10"
                  stroke="url(#lch-lightning-h)"
                  strokeWidth="2"
                  fill="none"
                  filter="url(#lch-glow)"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.svg>
              <div
                className="absolute whitespace-nowrap rounded-full border border-white/10 bg-[#0D0D0D] px-4 py-1.5 text-xs font-bold text-white"
                style={{ boxShadow: '0 0 20px rgba(147,51,234,0.3)' }}
              >
                🤖 LogiCora 🪄
              </div>
            </div>

            {/* ── RIGHT — CORA ── */}
            <motion.div
              className="relative flex min-h-[45vh] cursor-pointer items-center justify-center overflow-hidden md:min-h-screen"
              style={{ backgroundColor: '#0d0814' }}
              animate={{
                flex:
                  hoveredSide === 'right'
                    ? '0 0 55%'
                    : hoveredSide === 'left'
                      ? '0 0 45%'
                      : '0 0 50%',
              }}
              transition={{ duration: 0.3 }}
              onMouseEnter={() => setHoveredSide('right')}
              onMouseLeave={() => setHoveredSide(null)}
              onClick={() => handleSelect('cora')}
            >
              {/* Purple glow */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(147,51,234,0.15) 0%, transparent 70%)',
                  opacity: hoveredSide === 'right' ? 1.5 : 1,
                }}
              />

              {/* Purple particles */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-[#9333EA]/40"
                    animate={{
                      y: ['100%', '-100%'],
                      x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                      opacity: [0, 0.6, 0],
                    }}
                    transition={{
                      duration: 5 + Math.random() * 5,
                      repeat: Infinity,
                      delay: Math.random() * 5,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <motion.span
                  className="text-8xl md:text-9xl"
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.15 }}
                >
                  🪄
                </motion.span>
                <h2 className="mt-6 text-3xl font-black tracking-[0.3em] text-[#9333EA]">
                  CORA
                </h2>
                <p className="mt-2 text-sm text-white/30">Sənin köməkçin</p>
              </div>

              {/* Left border glow */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-1 hidden md:block"
                animate={{
                  boxShadow:
                    hoveredSide === 'right'
                      ? '0 0 20px 5px rgba(147,51,234,0.5)'
                      : 'none',
                  backgroundColor:
                    hoveredSide === 'right'
                      ? 'rgba(147,51,234,0.5)'
                      : 'transparent',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll hint */}
      <AnimatePresence>
        {!selected && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center"
          >
            <span className="text-sm text-white/20">Köməkçini seç</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className="mt-2 h-5 w-5 text-white/20" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
